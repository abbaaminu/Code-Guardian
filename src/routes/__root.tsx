import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import {
  RouteErrorFallback,
  RouteNotFoundFallback,
} from "@/components/route-boundaries";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "SecurePulse — Cyber Security & Code Integrity Auditor" },
        {
          name: "description",
          content:
            "Instantly scan code snippets, source files, and repos for OWASP Top 10, CWE, and secret exposure vulnerabilities with AI-generated patches.",
        },
        { name: "author", content: "SecurePulse" },
        {
          property: "og:title",
          content: "SecurePulse — Code Integrity Auditor",
        },
        {
          property: "og:description",
          content:
            "AI-powered security scanner for engineers and DevOps teams.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/securepulse-icon.svg", type: "image/svg+xml" },
        { rel: "apple-touch-icon", href: "/securepulse-icon.svg" },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: RouteNotFoundFallback,
    errorComponent: RouteErrorFallback,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
