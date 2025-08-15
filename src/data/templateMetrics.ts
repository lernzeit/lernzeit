import { supabase } from "@/integrations/supabase/client";

export async function logPlay(templateId: string, correct: boolean) {
  await supabase.from("template_events").insert({ template_id: templateId, type: correct ? "CORRECT":"INCORRECT" });
  await supabase.rpc("apply_template_stat", { tid: templateId, is_correct: correct });
}

export async function rateTemplate(templateId: string, stars: number) {
  await supabase.from("template_events").insert({ template_id: templateId, type:"RATING", payload:{ stars } });
  await supabase.rpc("apply_template_rating", { tid: templateId, stars });
}