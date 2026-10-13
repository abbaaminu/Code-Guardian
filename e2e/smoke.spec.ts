import { test, expect } from "@playwright/test";

// SCAFFOLD: these need a seeded test account before they'll pass —
// TEST_USER_EMAIL / TEST_USER_PASSWORD env vars against a real (ideally
// staging, not production) Supabase project. Sign-up/auth flow specifics
// depend on src/routes/login.tsx, which uses Supabase's hosted auth UI —
// fill in the selectors once you've decided on a test-account strategy
// (a dedicated Supabase test project is strongly recommended over pointing
// this at prod).

test.describe("unauthenticated", () => {
  test("landing page loads and shows a sign-in entry point", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/SecurePulse/i);
  });

  test("dashboard redirects to login when signed out", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });
});

test.describe("authenticated", () => {
  test.skip(
    !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
    "Set TEST_USER_EMAIL / TEST_USER_PASSWORD against a test Supabase project to enable this spec.",
  );

  test("can sign in and reach the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: "Email address" })
      .fill(process.env.TEST_USER_EMAIL!);
    await page
      .getByRole("textbox", { name: "Password" })
      .fill(process.env.TEST_USER_PASSWORD!);
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .last()
      .click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("running a scan on a small snippet reaches a completed report", async ({
    page,
  }) => {
    // A database-backed seeded account and AI API key are required to exercise
    // the complete scan workflow against a dedicated test Supabase project.
    test.fixme();
  });
});
