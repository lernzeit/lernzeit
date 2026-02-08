import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
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
  const earnedMinutes = body.earnedMinutes;
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

  if (!isValidNumber(earnedMinutes, 0, 9999)) {
    return new Response(JSON.stringify({ error: 'Ungültige verdiente Minuten' }), {
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
    .single();

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
    .single();

  // Determine daily limit based on current day
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const dailyLimit = childSettings ? 
    (isWeekend ? childSettings.weekend_max_minutes : childSettings.weekday_max_minutes) : 
    (isWeekend ? 60 : 30);

  // Check existing requests for today - ONLY count today's requests
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayRequests } = await supabase
    .from('screen_time_requests')
    .select('requested_minutes, status')
    .eq('child_id', childId)
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString());

  // Calculate total minutes already requested (pending + approved) today
  // Note: We now allow MULTIPLE parallel requests per day
  const pendingMinutesToday = todayRequests?.filter((req: any) => req.status === 'pending')
    .reduce((sum: number, req: any) => sum + req.requested_minutes, 0) || 0;
  const approvedMinutesToday = todayRequests?.filter((req: any) => req.status === 'approved')
    .reduce((sum: number, req: any) => sum + req.requested_minutes, 0) || 0;
  const totalClaimedToday = pendingMinutesToday + approvedMinutesToday;

  // Validate request doesn't exceed daily limit (only count today's pending + approved)
  if (totalClaimedToday + (requestedMinutes as number) > dailyLimit) {
    return new Response(JSON.stringify({ 
      error: `Die Anfrage würde das Tageslimit von ${dailyLimit} Minuten überschreiten. Bereits heute beantragt: ${totalClaimedToday} Minuten.` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get total available earned minutes from user_earned_minutes table (legacy/optional)
  const { data: earnedMinutesData } = await supabase
    .from('user_earned_minutes')
    .select('minutes_remaining')
    .eq('user_id', childId)
    .gt('minutes_remaining', 0);

  const legacyAvailableMinutes = earnedMinutesData?.reduce((sum: number, record: any) =>
    sum + (record.minutes_remaining || 0), 0) || 0;

  // Canonical availability calculation (matches frontend):
  // Sessions (seconds -> minutes, rounded up) + today's achievement bonus minutes - today's approved requests
  const { data: gameSessionsForDay } = await supabase
    .from('game_sessions')
    .select('time_earned')
    .eq('user_id', childId)
    .gte('session_date', todayStart.toISOString())
    .lte('session_date', todayEnd.toISOString());

  const { data: learningSessionsForDay } = await supabase
    .from('learning_sessions')
    .select('time_earned')
    .eq('user_id', childId)
    .gte('session_date', todayStart.toISOString())
    .lte('session_date', todayEnd.toISOString());

  const gameMinutes = gameSessionsForDay?.reduce((sum: number, s: any) =>
    sum + Math.ceil((s.time_earned || 0) / 60), 0) || 0;
  const learningMinutes = learningSessionsForDay?.reduce((sum: number, s: any) =>
    sum + Math.ceil((s.time_earned || 0) / 60), 0) || 0;
  const sessionMinutes = gameMinutes + learningMinutes;

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
    .gte('earned_at', todayStart.toISOString())
    .lte('earned_at', todayEnd.toISOString());

  const achievementMinutes = todayAchievements?.reduce((sum: number, ua: any) =>
    sum + (ua.achievements_template?.reward_minutes || 0), 0) || 0;

  // IMPORTANT: Subtract BOTH pending AND approved today - pending minutes are "reserved"
  const claimedToday = todayRequests?.filter((r: any) => r.status === 'pending' || r.status === 'approved')
    .reduce((sum: number, r: any) => sum + (r.requested_minutes || 0), 0) || 0;

  const canonicalAvailableMinutes = Math.max(0, (sessionMinutes + achievementMinutes) - claimedToday);

  // Use the canonical value for validation (prevents false negatives when legacy table is out of sync)
  const totalAvailableMinutes = Math.max(legacyAvailableMinutes, canonicalAvailableMinutes);

  console.log('Available minutes (validation):', {
    legacyAvailableMinutes,
    canonicalAvailableMinutes,
    gameMinutes,
    learningMinutes,
    sessionMinutes,
    achievementMinutes,
    achievementError,
    claimedToday,
    totalAvailableMinutes
  });

  // Validate enough earned minutes available (canonical)
  if ((requestedMinutes as number) > totalAvailableMinutes) {
    return new Response(JSON.stringify({
      error: `Nicht genügend verdiente Minuten verfügbar. Du hast ${totalAvailableMinutes} Minuten verdient, aber ${requestedMinutes} Minuten beantragt.`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Create the request
  const { data: request, error } = await supabase
    .from('screen_time_requests')
    .insert({
      child_id: childId,
      parent_id: parentId,
      requested_minutes: requestedMinutes,
      earned_minutes: earnedMinutes,
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
      request_date: todayStart.toISOString().split('T')[0],
      total_minutes_requested: totalClaimedToday + (requestedMinutes as number),
      total_minutes_approved: approvedMinutesToday
    }, {
      onConflict: 'user_id,request_date'
    });

  // Reserve the requested minutes (mark as requested but not yet consumed)
  let remainingToReserve = requestedMinutes as number;
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

  // Get child profile for notification
  const { data: childProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', childId)
    .single();

  console.log(`Screen time request from ${childProfile?.name}: ${requestedMinutes} minutes (Daily limit: ${dailyLimit}, Available: ${totalAvailableMinutes}, Claimed today: ${totalClaimedToday})`);

  // Send email notification to parent
  await sendParentNotification(supabase, parentId as string, childProfile?.name || 'Ihr Kind', requestedMinutes as number, sanitizedMessage, request.id);

  return new Response(JSON.stringify({ 
    success: true, 
    request,
    validation: {
      dailyLimit,
      totalClaimedToday: totalClaimedToday + (requestedMinutes as number),
      availableMinutes: totalAvailableMinutes - (requestedMinutes as number)
    },
    deep_links: generateDeepLinks(requestedMinutes as number)
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
    const today = new Date().toISOString().split('T')[0];
    
    const { data: dailySummary } = await supabase
      .from('daily_request_summary')
      .select('*')
      .eq('user_id', request.child_id)
      .eq('request_date', today)
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
 * Send email notification to parent when child creates a screen time request
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
    
    // Get the app URL for deep linking
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://lernzeit.lovable.app';
    
    // Create approval link that opens the app
    const approvalLink = `${appUrl}?action=approve_request&request_id=${requestId}`;
    
    // Format the email content
    const emailSubject = `📱 ${childName} möchte Bildschirmzeit`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bildschirmzeit-Anfrage</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">📱 Bildschirmzeit-Anfrage</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 24px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
        <strong>${childName}</strong> hat heute fleißig gelernt und möchte nun Bildschirmzeit einlösen:
      </p>
      
      <!-- Minutes Card -->
      <div style="background-color: #dbeafe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; font-weight: bold; color: #1d4ed8;">${requestedMinutes}</div>
        <div style="color: #1e40af; font-size: 14px;">Minuten angefragt</div>
      </div>
      
      ${message ? `
      <!-- Child's Message -->
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Nachricht von ${childName}:</div>
        <div style="font-size: 14px; color: #374151;">"${message}"</div>
      </div>
      ` : ''}
      
      <!-- Action Button -->
      <a href="${approvalLink}" style="display: block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 16px 24px; border-radius: 12px; text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 16px;">
        ✓ In der App antworten
      </a>
      
      <!-- Instructions -->
      <div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; margin-top: 20px;">
        <div style="font-size: 14px; font-weight: bold; color: #92400e; margin-bottom: 8px;">So funktioniert's:</div>
        <ol style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px;">
          <li style="margin-bottom: 4px;">Öffnen Sie die LernZeit App</li>
          <li style="margin-bottom: 4px;">Genehmigen oder lehnen Sie die Anfrage ab</li>
          <li>Geben Sie die Zeit in Family Link / Bildschirmzeit frei</li>
        </ol>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        LernZeit - Lernen wird belohnt 📚
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Use Supabase's auth.admin API to send email
    // Note: This uses the built-in Supabase email functionality
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (RESEND_API_KEY) {
      // Use Resend if available for better deliverability
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LernZeit <noreply@lernzeit.app>',
          to: [parentEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resend email error:', errorText);
      } else {
        console.log(`📧 Email notification sent to parent: ${parentEmail}`);
      }
    } else {
      // Fallback: Log that email would be sent (can integrate with Supabase Edge Functions email later)
      console.log(`📧 Email notification would be sent to: ${parentEmail}`);
      console.log(`Subject: ${emailSubject}`);
      console.log(`Request: ${childName} requests ${requestedMinutes} minutes`);
      
      // Store notification in database for in-app display
      await supabase
        .from('screen_time_requests')
        .update({
          // Mark that parent should be notified in-app
          request_message: message || `${childName} möchte ${requestedMinutes} Minuten Bildschirmzeit.`
        })
        .eq('id', requestId);
    }
  } catch (error) {
    // Don't fail the request if email fails - just log it
    console.error('Failed to send parent notification:', error);
  }
}