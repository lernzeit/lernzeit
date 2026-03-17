import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas and helpers
const VALID_ACTIONS = ['create_request', 'respond_to_request', 'get_requests'] as const;
const VALID_STATUSES = ['approved', 'denied'] as const;
const VALID_ROLES = ['child', 'parent'] as const;

type ValidAction = typeof VALID_ACTIONS[number];

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && uuidRegex.test(str);
}

function isValidAction(action: unknown): action is ValidAction {
  return typeof action === 'string' && VALID_ACTIONS.includes(action as ValidAction);
}

function isValidNumber(val: unknown, min: number, max: number): val is number {
  return typeof val === 'number' && !isNaN(val) && val >= min && val <= max;
}

function sanitizeString(str: unknown, maxLength: number = 500): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

// Sanitize error messages to prevent information leakage
function getSafeErrorMessage(error: Error): string {
  const message = error.message?.toLowerCase() || '';
  
  // Map internal errors to generic messages
  if (message.includes('auth') || message.includes('token') || message.includes('jwt')) {
    return 'Authentifizierungsfehler. Bitte melde dich erneut an.';
  }
  if (message.includes('database') || message.includes('sql') || message.includes('pg_')) {
    return 'Datenbankfehler. Bitte versuche es später erneut.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'Netzwerkfehler. Bitte prüfe deine Verbindung.';
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Ungültige Eingabe. Bitte überprüfe deine Daten.';
  }
  
  // Return generic error for unknown cases
  return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.';
}

function getUtcDayRange(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start,
    end,
    dateKey: start.toISOString().split('T')[0],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode the JWT to get user info - Supabase gateway already verified the token
    let user: { id: string; email?: string };
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      if (!payload.sub) throw new Error('No sub in token');
      user = { id: payload.sub, email: payload.email };
      console.log('User authenticated:', user.id);
    } catch (e) {
      console.error('Token decode error:', e);
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Ungültiges Anfrageformat' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (typeof requestBody !== 'object' || requestBody === null) {
      return new Response(JSON.stringify({ error: 'Ungültiges Anfrageformat' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = requestBody as Record<string, unknown>;
    const action = body.action;

    // Validate action
    if (!isValidAction(action)) {
      return new Response(JSON.stringify({ error: 'Ungültige Aktion' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'create_request':
        return await createScreenTimeRequest(supabase, user.id, body);
      case 'respond_to_request':
        return await respondToRequest(supabase, user.id, body);
      case 'get_requests':
        return await getRequests(supabase, user.id, body);
      default:
        return new Response(JSON.stringify({ error: 'Ungültige Aktion' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Screen time request error:', error);
    return new Response(JSON.stringify({ error: getSafeErrorMessage(error as Error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createScreenTimeRequest(supabase: any, childId: string, body: Record<string, unknown>) {
  // Validate required fields
  const parentId = body.parentId;
  const requestedMinutes = body.requestedMinutes;
  const message = body.message;

  if (!isValidUUID(parentId as string)) {
    return new Response(JSON.stringify({ error: 'Ungültige Eltern-ID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!isValidNumber(requestedMinutes, 1, 480)) {
    return new Response(JSON.stringify({ error: 'Ungültige Minutenanzahl (1-480)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const sanitizedMessage = sanitizeString(message, 500);

  // Verify parent-child relationship
  const { data: relationship } = await supabase
    .from('parent_child_relationships')
    .select('*')
    .eq('child_id', childId)
    .eq('parent_id', parentId)
    .maybeSingle();

  if (!relationship) {
    return new Response(JSON.stringify({ error: 'Eltern-Kind-Beziehung nicht gefunden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get child settings for daily limits
  const { data: childSettings } = await supabase
    .from('child_settings')
    .select('weekday_max_minutes, weekend_max_minutes')
    .eq('child_id', childId)
    .maybeSingle();

  const { start: todayStart, end: todayEnd, dateKey: todayKey } = getUtcDayRange();

  // Determine daily limit based on UTC day to match frontend + backend consistently
  const isWeekend = todayStart.getUTCDay() === 0 || todayStart.getUTCDay() === 6;
  const dailyLimit = childSettings
    ? (isWeekend ? childSettings.weekend_max_minutes : childSettings.weekday_max_minutes)
    : (isWeekend ? 60 : 30);

  const todayStartIso = todayStart.toISOString();
  const todayEndIso = todayEnd.toISOString();

  const { data: todayRequests } = await supabase
    .from('screen_time_requests')
    .select('requested_minutes, status')
    .eq('child_id', childId)
    .gte('created_at', todayStartIso)
    .lt('created_at', todayEndIso);

  // Calculate total minutes already requested (pending + approved) today
  // Note: We now allow MULTIPLE parallel requests per day
  const pendingMinutesToday = todayRequests?.filter((req: any) => req.status === 'pending')
    .reduce((sum: number, req: any) => sum + req.requested_minutes, 0) || 0;
  const approvedMinutesToday = todayRequests?.filter((req: any) => req.status === 'approved')
    .reduce((sum: number, req: any) => sum + req.requested_minutes, 0) || 0;
  const totalClaimedToday = pendingMinutesToday + approvedMinutesToday;
  const remainingDailyLimit = Math.max(0, dailyLimit - totalClaimedToday);

  if (remainingDailyLimit < 1) {
    return new Response(JSON.stringify({
      error: `Dein Tageslimit von ${dailyLimit} Minuten ist für heute bereits ausgeschöpft.`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Canonical availability calculation:
  // sum all today's session seconds, convert once to minutes, add today's achievement minutes,
  // then subtract all today's pending + approved requests.
  const { data: gameSessionsForDay } = await supabase
    .from('game_sessions')
    .select('time_earned')
    .eq('user_id', childId)
    .gte('session_date', todayStartIso)
    .lt('session_date', todayEndIso);

  const { data: learningSessionsForDay } = await supabase
    .from('learning_sessions')
    .select('time_earned')
    .eq('user_id', childId)
    .gte('session_date', todayStartIso)
    .lt('session_date', todayEndIso);

  const gameTotalSeconds = gameSessionsForDay?.reduce((sum: number, s: any) =>
    sum + (Number(s.time_earned) || 0), 0) || 0;
  const learningTotalSeconds = learningSessionsForDay?.reduce((sum: number, s: any) =>
    sum + (Number(s.time_earned) || 0), 0) || 0;
  const totalSessionSeconds = gameTotalSeconds + learningTotalSeconds;
  const sessionMinutes = Math.ceil(totalSessionSeconds / 60);

  const { data: todayAchievements, error: achievementError } = await supabase
    .from('user_achievements')
    .select(`
      achievements_template!inner (
        name,
        reward_minutes
      )
    `)
    .eq('user_id', childId)
    .eq('is_completed', true)
    .gte('earned_at', todayStartIso)
    .lt('earned_at', todayEndIso);

  const achievementMinutes = todayAchievements?.reduce((sum: number, ua: any) =>
    sum + (ua.achievements_template?.reward_minutes || 0), 0) || 0;

  const rawEarnedMinutes = sessionMinutes + achievementMinutes;
  const cappedEarnedMinutes = Math.min(rawEarnedMinutes, dailyLimit);
  const canonicalAvailableMinutes = Math.max(0, cappedEarnedMinutes - totalClaimedToday);
  const effectiveRequestedMinutes = Math.min(
    requestedMinutes as number,
    canonicalAvailableMinutes,
    remainingDailyLimit,
  );
  const serverEarnedMinutes = cappedEarnedMinutes;

  console.log('Available minutes (canonical UTC validation):', {
    gameTotalSeconds,
    learningTotalSeconds,
    sessionMinutes,
    achievementMinutes,
    rawEarnedMinutes,
    cappedEarnedMinutes,
    achievementError,
    pendingMinutesToday,
    approvedMinutesToday,
    totalClaimedToday,
    remainingDailyLimit,
    canonicalAvailableMinutes,
    requestedMinutes,
    effectiveRequestedMinutes,
  });

  if (effectiveRequestedMinutes < 1) {
    return new Response(JSON.stringify({
      error: `Nicht genügend verdiente Minuten verfügbar. Aktuell sind ${canonicalAvailableMinutes} Minuten verfügbar.`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (effectiveRequestedMinutes !== (requestedMinutes as number)) {
    console.log('Adjusting requested minutes to current canonical availability', {
      childId,
      requestedMinutes,
      effectiveRequestedMinutes,
      canonicalAvailableMinutes,
      remainingDailyLimit,
    });
  }

  // Create the request using server-side calculated earned minutes only
  const { data: request, error } = await supabase
    .from('screen_time_requests')
    .insert({
      child_id: childId,
      parent_id: parentId,
      requested_minutes: effectiveRequestedMinutes,
      earned_minutes: serverEarnedMinutes,
      request_message: sanitizedMessage
    })
    .select()
    .single();

  if (error) {
    console.error('Database insert error:', error);
    return new Response(JSON.stringify({ error: 'Anfrage konnte nicht erstellt werden' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Update daily request summary
  await supabase
    .from('daily_request_summary')
    .upsert({
      user_id: childId,
      request_date: todayKey,
      total_minutes_requested: totalClaimedToday + effectiveRequestedMinutes,
      total_minutes_approved: approvedMinutesToday
    }, {
      onConflict: 'user_id,request_date'
    });

  // Keep legacy reservation table in sync for older flows, but do not use it for validation.
  let remainingToReserve = effectiveRequestedMinutes;
  const { data: availableEarnedMinutes } = await supabase
    .from('user_earned_minutes')
    .select('*')
    .eq('user_id', childId)
    .gt('minutes_remaining', 0)
    .order('earned_at', { ascending: true });

  for (const earnedRecord of availableEarnedMinutes || []) {
    if (remainingToReserve <= 0) break;

    const minutesToReserve = Math.min(remainingToReserve, earnedRecord.minutes_remaining);

    await supabase
      .from('user_earned_minutes')
      .update({
        minutes_requested: earnedRecord.minutes_requested + minutesToReserve
      })
      .eq('id', earnedRecord.id);

    remainingToReserve -= minutesToReserve;
  }

  if (remainingToReserve > 0) {
    console.warn('Legacy earned-minutes reservation out of sync with canonical calculation', {
      childId,
      requestedMinutes: effectiveRequestedMinutes,
      remainingToReserve,
      canonicalAvailableMinutes,
    });
  }

  // Get child profile for notification
  const { data: childProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', childId)
    .maybeSingle();

  console.log(`Screen time request from ${childProfile?.name}: ${effectiveRequestedMinutes} minutes (Daily limit: ${dailyLimit}, Canonical available: ${canonicalAvailableMinutes}, Claimed today: ${totalClaimedToday})`);

  // Send email notification to parent
  await sendParentNotification(supabase, parentId as string, childProfile?.name || 'Ihr Kind', effectiveRequestedMinutes, sanitizedMessage, request.id);

  return new Response(JSON.stringify({ 
    success: true, 
    request,
    validation: {
      dailyLimit,
      totalClaimedToday: totalClaimedToday + effectiveRequestedMinutes,
      availableMinutes: Math.max(0, canonicalAvailableMinutes - effectiveRequestedMinutes),
      requestedMinutesApplied: effectiveRequestedMinutes,
    },
    deep_links: generateDeepLinks(effectiveRequestedMinutes)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function respondToRequest(supabase: any, parentId: string, body: Record<string, unknown>) {
  // Validate required fields
  const requestId = body.requestId;
  const status = body.status;
  const response = body.response;

  if (!isValidUUID(requestId as string)) {
    return new Response(JSON.stringify({ error: 'Ungültige Anfrage-ID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return new Response(JSON.stringify({ error: 'Ungültiger Status' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const sanitizedResponse = sanitizeString(response, 500);

  // Verify the request belongs to this parent
  const { data: request } = await supabase
    .from('screen_time_requests')
    .select('*')
    .eq('id', requestId)
    .eq('parent_id', parentId)
    .eq('status', 'pending')
    .single();

  if (!request) {
    return new Response(JSON.stringify({ error: 'Anfrage nicht gefunden oder bereits bearbeitet' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Update the request
  const { data: updatedRequest, error } = await supabase
    .from('screen_time_requests')
    .update({
      status,
      parent_response: sanitizedResponse,
      responded_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Database update error:', error);
    return new Response(JSON.stringify({ error: 'Anfrage konnte nicht aktualisiert werden' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // If request is denied, release the reserved minutes
  if (status === 'denied') {
    let minutesToRelease = request.requested_minutes;
    
    const { data: reservedMinutes } = await supabase
      .from('user_earned_minutes')
      .select('*')
      .eq('user_id', request.child_id)
      .gt('minutes_requested', 0)
      .order('earned_at', { ascending: true });

    for (const earnedRecord of reservedMinutes || []) {
      if (minutesToRelease <= 0) break;
      
      const minutesToUnreserve = Math.min(minutesToRelease, earnedRecord.minutes_requested);
      
      await supabase
        .from('user_earned_minutes')
        .update({
          minutes_requested: earnedRecord.minutes_requested - minutesToUnreserve
        })
        .eq('id', earnedRecord.id);
      
      minutesToRelease -= minutesToUnreserve;
    }
  }

  // Update daily request summary
  if (status === 'approved') {
    const { dateKey: todayKey } = getUtcDayRange();

    const { data: dailySummary } = await supabase
      .from('daily_request_summary')
      .select('*')
      .eq('user_id', request.child_id)
      .eq('request_date', todayKey)
      .single();

    if (dailySummary) {
      await supabase
        .from('daily_request_summary')
        .update({
          total_minutes_approved: dailySummary.total_minutes_approved + request.requested_minutes
        })
        .eq('id', dailySummary.id);
    }
  }

  return new Response(JSON.stringify({ success: true, request: updatedRequest }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getRequests(supabase: any, userId: string, body: Record<string, unknown>) {
  // Validate role
  const role = body.role;

  if (typeof role !== 'string' || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return new Response(JSON.stringify({ error: 'Ungültige Rolle' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let query = supabase.from('screen_time_requests').select('*');

  if (role === 'child') {
    query = query.eq('child_id', userId);
  } else if (role === 'parent') {
    query = query.eq('parent_id', userId);
  }

  const { data: requests, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Database query error:', error);
    return new Response(JSON.stringify({ error: 'Anfragen konnten nicht geladen werden' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ requests }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function generateDeepLinks(minutes: number) {
  return {
    ios_screen_time: `prefs:root=SCREEN_TIME&path=DOWNTIME_REQUEST`,
    android_family_link: `https://families.google.com/supervision/time-limits/request?minutes=${minutes}`,
    fallback_web: `https://support.apple.com/en-us/HT201304` // Apple Screen Time support
  };
}

/**
 * Send email notification to parent when child creates a screen time request.
 * Uses the same pgmq email queue as auth emails (password reset etc.)
 */
async function sendParentNotification(
  supabase: any, 
  parentId: string, 
  childName: string, 
  requestedMinutes: number,
  message: string,
  requestId: string
) {
  try {
    // Get parent's email from auth.users table
    const { data: parentUser, error: userError } = await supabase.auth.admin.getUserById(parentId);
    
    if (userError || !parentUser?.user?.email) {
      console.log('Could not get parent email:', userError?.message || 'No email found');
      return;
    }

    const parentEmail = parentUser.user.email;
    const appUrl = 'https://lernzeit.lovable.app';
    const approvalLink = `${appUrl}?action=approve_request&request_id=${requestId}`;

    const emailSubject = `📱 ${childName} möchte Bildschirmzeit`;
    const emailHtml = `
<!DOCTYPE html>
<html lang="de" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 480px; margin: 0 auto; padding: 0;">
    <div style="background-color: hsl(217, 91%, 60%); padding: 24px 25px; border-radius: 12px 12px 0 0;">
      <p style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0; letter-spacing: -0.5px;">📖 LernZeit</p>
    </div>
    <h1 style="font-size: 22px; font-weight: bold; color: hsl(240, 10%, 15%); margin: 24px 25px 12px; padding: 0;">Bildschirmzeit-Anfrage</h1>
    <p style="font-size: 15px; color: hsl(240, 5%, 45%); line-height: 1.6; margin: 0 25px 20px;">
      <strong>${childName}</strong> hat fleißig gelernt und möchte Bildschirmzeit einlösen:
    </p>
    <div style="background-color: #dbeafe; border-radius: 12px; padding: 20px; text-align: center; margin: 0 25px 20px;">
      <div style="font-size: 48px; font-weight: bold; color: #1d4ed8;">${requestedMinutes}</div>
      <div style="color: #1e40af; font-size: 14px;">Minuten angefragt</div>
    </div>
    ${message ? `
    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 16px; margin: 0 25px 20px;">
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Nachricht von ${childName}:</div>
      <div style="font-size: 14px; color: #374151;">"${message}"</div>
    </div>` : ''}
    <div style="text-align: center; margin: 8px 25px 24px;">
      <a href="${approvalLink}" style="background-color: hsl(217, 91%, 60%); color: #ffffff; font-size: 15px; font-weight: 600; border-radius: 10px; padding: 14px 28px; text-decoration: none; display: inline-block;">
        In der App antworten
      </a>
    </div>
    <p style="font-size: 13px; color: hsl(240, 5%, 65%); margin: 0 25px 24px; line-height: 1.5;">
      Öffne die LernZeit App, um die Anfrage zu genehmigen oder abzulehnen.
    </p>
    <div style="font-size: 12px; color: hsl(240, 5%, 65%); margin: 0; padding: 16px 25px; border-top: 1px solid hsl(240, 20%, 92%); text-align: center;">
      <span style="font-weight: bold; color: hsl(217, 91%, 60%);">LernZeit</span> – Dein persönlicher Lern-Assistent
    </div>
  </div>
</body>
</html>`.trim();

    const plainText = `${childName} möchte ${requestedMinutes} Minuten Bildschirmzeit.\n${message ? `Nachricht: "${message}"\n` : ''}Öffne die LernZeit App, um zu antworten: ${approvalLink}`;

    const messageId = crypto.randomUUID();

    // Log pending
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'screen_time_request',
      recipient_email: parentEmail,
      status: 'pending',
    });

    // Enqueue via the same pgmq queue used by auth emails
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: parentEmail,
        from: 'LernZeit <noreply@lernzeit.app>',
        sender_domain: 'mail.lernzeit.app',
        subject: emailSubject,
        html: emailHtml,
        text: plainText,
        purpose: 'transactional',
        label: 'screen_time_request',
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error('Failed to enqueue parent notification email:', enqueueError);
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'screen_time_request',
        recipient_email: parentEmail,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      });
    } else {
      console.log(`📧 Parent notification email enqueued for: ${parentEmail}`);
    }
  } catch (error) {
    // Don't fail the request if email fails
    console.error('Failed to send parent notification:', error);
  }
}