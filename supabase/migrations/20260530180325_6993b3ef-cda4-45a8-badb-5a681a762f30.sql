-- Allow admins to view all referral and grant data for tracking dashboard
CREATE POLICY "Admins view all referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all referral codes" ON public.referral_codes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all milestones" ON public.referral_milestones
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all premium grants" ON public.premium_grants
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));