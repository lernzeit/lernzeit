import { supabase } from "@/integrations/supabase/client";

export async function logPlay(templateId: string, correct: boolean) {
  // Only use RPC calls since template_events table doesn't exist
  await supabase.rpc("apply_template_stat", { tid: templateId, is_correct: correct });
}

export async function rateTemplate(templateId: string, stars: number) {
  // Only use RPC calls since template_events table doesn't exist
  await supabase.rpc("apply_template_rating", { tid: templateId, stars });
}