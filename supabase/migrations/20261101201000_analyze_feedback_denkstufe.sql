-- analyze-feedback (01.11.2026): Bei thinking_level 'high' und 4096 Ausgabe-Tokens verbrauchte das Denken
-- fast alles (3928 Tokens), das Regelwerk fehlte. 'low' reicht für das Zusammenfassen und kostet weniger.
update public.ai_model_config set thinking_level = 'low', max_output_tokens = 8192 where use_case = 'analyze_feedback';
