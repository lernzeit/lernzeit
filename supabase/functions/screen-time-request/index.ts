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

  // Get child and parent profiles for notification
  const { data: childProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', childId)
    .single();

  // Send push notification to parent (simplified - would need FCM/APNs integration)
  console.log(`Screen time request from ${childProfile?.name}: ${requestedMinutes} minutes`);

  return new Response(JSON.stringify({ 
    success: true, 
    request,
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