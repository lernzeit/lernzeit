-- Enable service role to insert templates
CREATE POLICY "Service role can insert templates" 
ON public.templates 
FOR INSERT 
WITH CHECK (true);

-- Enable service role to update templates  
CREATE POLICY "Service role can update templates"
ON public.templates 
FOR UPDATE 
USING (true);

-- Ensure authenticated users can still view
-- (This policy already exists but let's make sure)
CREATE POLICY "Anyone can view active templates" 
ON public.templates 
FOR SELECT 
USING (status = 'ACTIVE');

-- Alternative: Allow system/service operations
CREATE POLICY "System can manage templates"
ON public.templates 
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')