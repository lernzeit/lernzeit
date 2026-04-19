
UPDATE public.screen_time_requests
SET status = 'approved',
    responded_at = now(),
    parent_response = 'Automatisch genehmigt (anderer Elternteil hatte bereits zugestimmt)'
WHERE id = 'c3c7b3f7-a6f8-4e25-ae8f-39ef12ac2537'
  AND status = 'pending';
