-- Create screen time requests table
CREATE TABLE public.screen_time_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  requested_minutes INTEGER NOT NULL,
  earned_minutes INTEGER NOT NULL,
  request_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  parent_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Enable RLS
ALTER TABLE public.screen_time_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Children can create requests to their parents"
ON public.screen_time_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = child_id 
  AND parent_id IN (
    SELECT pcr.parent_id 
    FROM public.parent_child_relationships pcr 
    WHERE pcr.child_id = auth.uid()
  )
);

CREATE POLICY "Children can view their own requests"
ON public.screen_time_requests
FOR SELECT
TO authenticated
USING (auth.uid() = child_id);

CREATE POLICY "Parents can view requests from their children"
ON public.screen_time_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = parent_id 
  AND child_id IN (
    SELECT pcr.child_id 
    FROM public.parent_child_relationships pcr 
    WHERE pcr.parent_id = auth.uid()
  )
);

CREATE POLICY "Parents can update requests from their children"
ON public.screen_time_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = parent_id 
  AND child_id IN (
    SELECT pcr.child_id 
    FROM public.parent_child_relationships pcr 
    WHERE pcr.parent_id = auth.uid()
  )
);

-- Create function to cleanup expired requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_screen_time_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.screen_time_requests 
  WHERE expires_at < NOW() AND status = 'pending';
END;
$$;

-- Create index for performance
CREATE INDEX idx_screen_time_requests_child_id ON public.screen_time_requests(child_id);
CREATE INDEX idx_screen_time_requests_parent_id ON public.screen_time_requests(parent_id);
CREATE INDEX idx_screen_time_requests_status ON public.screen_time_requests(status);