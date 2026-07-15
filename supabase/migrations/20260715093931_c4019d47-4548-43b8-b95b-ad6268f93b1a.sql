
-- Lock down public tables. All access now flows through server functions using the service role.
DROP POLICY IF EXISTS "Public read scans" ON public.scans;
DROP POLICY IF EXISTS "Public insert scans" ON public.scans;
DROP POLICY IF EXISTS "Public update scans" ON public.scans;
DROP POLICY IF EXISTS "Public delete scans" ON public.scans;

DROP POLICY IF EXISTS "Public read vulns" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Public insert vulns" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Public update vulns" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Public delete vulns" ON public.vulnerabilities;

DROP POLICY IF EXISTS "Public read policies" ON public.policies;
DROP POLICY IF EXISTS "Public update policies" ON public.policies;

-- Ensure RLS remains enabled (deny-by-default with no policies for anon/authenticated).
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Revoke Data API access from anon/authenticated. Service role (used by server functions) retains full access and bypasses RLS.
REVOKE ALL ON public.scans FROM anon, authenticated;
REVOKE ALL ON public.vulnerabilities FROM anon, authenticated;
REVOKE ALL ON public.policies FROM anon, authenticated;

GRANT ALL ON public.scans TO service_role;
GRANT ALL ON public.vulnerabilities TO service_role;
GRANT ALL ON public.policies TO service_role;
