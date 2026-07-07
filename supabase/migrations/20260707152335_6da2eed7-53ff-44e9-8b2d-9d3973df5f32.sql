
CREATE TYPE public.scan_status AS ENUM ('queued', 'scanning', 'completed', 'failed');
CREATE TYPE public.vuln_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'Unknown',
  status public.scan_status NOT NULL DEFAULT 'queued',
  health_score INTEGER NOT NULL DEFAULT 0 CHECK (health_score BETWEEN 0 AND 100),
  vulnerabilities_count JSONB NOT NULL DEFAULT '{"critical":0,"high":0,"medium":0,"low":0}'::jsonb,
  source_code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scans TO anon, authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scans" ON public.scans FOR SELECT USING (true);
CREATE POLICY "Public insert scans" ON public.scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update scans" ON public.scans FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete scans" ON public.scans FOR DELETE USING (true);

CREATE TABLE public.vulnerabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity public.vuln_severity NOT NULL,
  cwe_id TEXT,
  vulnerable_code_block TEXT NOT NULL DEFAULT '',
  fixed_code_block TEXT NOT NULL DEFAULT '',
  remediation_steps TEXT NOT NULL DEFAULT '',
  file_path TEXT,
  line_start INTEGER,
  line_end INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vulnerabilities TO anon, authenticated;
GRANT ALL ON public.vulnerabilities TO service_role;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vulns" ON public.vulnerabilities FOR SELECT USING (true);
CREATE POLICY "Public insert vulns" ON public.vulnerabilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vulns" ON public.vulnerabilities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete vulns" ON public.vulnerabilities FOR DELETE USING (true);

CREATE INDEX idx_vulns_scan_id ON public.vulnerabilities(scan_id);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);

CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO anon, authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read policies" ON public.policies FOR SELECT USING (true);
CREATE POLICY "Public update policies" ON public.policies FOR UPDATE USING (true) WITH CHECK (true);
