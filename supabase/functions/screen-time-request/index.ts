import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, ...body } = await req.json();

    switch (action) {
      case 'create_request':
        return await createScreenTimeRequest(supabase, user.id, body);
      case 'respond_to_request':
        return await respondToRequest(supabase, user.id, body);
      case 'get_requests':
        return await getRequests(supabase, user.id, body);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Screen time request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createScreenTimeRequest(supabase: any, childId: string, body: any) {
  const { parentId, requestedMinutes, earnedMinutes, message } = body;

  // Verify parent-child relationship
  const { data: relationship } = await supabase
    .from('parent_child_relationships')
    .select('*')
    .eq('child_id', childId)
    .eq('parent_id', parentId)
    .single();

  if (!relationship) {
    return new Response(JSON.stringify({ error: 'Parent-child relationship not found' }), {
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

  // Check existing requests for today
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

  // Check if there's already a pending request
  const pendingRequest = todayRequests?.find(req => req.status === 'pending');
  if (pendingRequest) {
    return new Response(JSON.stringify({ 
      error: 'Es gibt bereits eine ausstehende Bildschirmzeit-Anfrage. Bitte warte auf die Antwort deiner Eltern.' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Calculate total minutes already requested/approved today
  const totalRequestedToday = todayRequests?.reduce((sum, req) => sum + req.requested_minutes, 0) || 0;
  const totalApprovedToday = todayRequests?.filter(req => req.status === 'approved')
    .reduce((sum, req) => sum + req.requested_minutes, 0) || 0;

  // Validate request doesn't exceed daily limit
  if (totalRequestedToday + requestedMinutes > dailyLimit) {
    return new Response(JSON.stringify({ 
      error: `Die Anfrage würde das Tageslimit von ${dailyLimit} Minuten überschreiten. Bereits heute beantragt: ${totalRequestedToday} Minuten.` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get total available earned minutes (not yet requested)
  const { data: earnedMinutesData } = await supabase
    .from('user_earned_minutes')
    .select('minutes_remaining')
    .eq('user_id', childId)
    .gt('minutes_remaining', 0);

  const totalAvailableMinutes = earnedMinutesData?.reduce((sum, record) => sum + record.minutes_remaining, 0) || 0;

  // Validate enough earned minutes available
  if (requestedMinutes > totalAvailableMinutes) {
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
      request_message: message
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
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
      total_minutes_requested: totalRequestedToday + requestedMinutes,
      total_minutes_approved: totalApprovedToday
    }, {
      onConflict: 'user_id,request_date'
    });

  // Reserve the requested minutes (mark as requested but not yet consumed)
  let remainingToReserve = requestedMinutes;
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

  console.log(`Screen time request from ${childProfile?.name}: ${requestedMinutes} minutes (Daily limit: ${dailyLimit}, Available: ${totalAvailableMinutes})`);

  return new Response(JSON.stringify({ 
    success: true, 
    request,
    validation: {
      dailyLimit,
      totalRequestedToday: totalRequestedToday + requestedMinutes,
      availableMinutes: totalAvailableMinutes - requestedMinutes
    },
    deep_links: generateDeepLinks(requestedMinutes)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function respondToRequest(supabase: any, parentId: string, body: any) {
  const { requestId, status, response } = body;

  // Verify the request belongs to this parent
  const { data: request } = await supabase
    .from('screen_time_requests')
    .select('*')
    .eq('id', requestId)
    .eq('parent_id', parentId)
    .eq('status', 'pending')
    .single();

  if (!request) {
    return new Response(JSON.stringify({ error: 'Request not found or already processed' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Update the request
  const { data: updatedRequest, error } = await supabase
    .from('screen_time_requests')
    .update({
      status,
      parent_response: response,
      responded_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
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

async function getRequests(supabase: any, userId: string, body: any) {
  const { role } = body;

  let query = supabase.from('screen_time_requests').select('*');

  if (role === 'child') {
    query = query.eq('child_id', userId);
  } else if (role === 'parent') {
    query = query.eq('parent_id', userId);
  }

  const { data: requests, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
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