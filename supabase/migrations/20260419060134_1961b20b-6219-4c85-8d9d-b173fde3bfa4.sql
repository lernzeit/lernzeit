-- Enable full row data in realtime payloads for UPDATE/DELETE events.
-- Without this, payload.old only contains primary key columns, so the
-- usePushNotifications and useScreenTimeRequests hooks cannot detect a
-- status transition (pending -> approved/denied) and never fire toasts /
-- local notifications to children or parents.
ALTER TABLE public.screen_time_requests REPLICA IDENTITY FULL;