import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

export const indexRepository = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string().default("main"),
      })
      .parse(input),
  )
  .handler(async () => ({
    success: false,
    message:
      "Repository vector indexing has been retired. The remediation agent now reads source files directly from GitHub.",
  }));
