import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Random variant selection with specified probabilities
    const random = Math.random();
    let variant: string;
    let need_image: boolean;

    if (random < 0.5) {
      // 50% MULTIPLE_CHOICE
      variant = "MULTIPLE_CHOICE";
      need_image = false;
    } else if (random < 0.7) {
      // 20% SORT
      variant = "SORT";
      need_image = false;
    } else if (random < 0.9) {
      // 20% MATCH
      variant = "MATCH";
      need_image = false;
    } else {
      // 10% FREETEXT
      variant = "FREETEXT";
      need_image = Math.random() < 0.2;
    }

    const response = {
      variant,
      need_image
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});