import { createFileRoute, redirect } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/components/route-boundaries";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  // Redirect-only route, but keep an error boundary as a safety net for any
  // failure in the load phase.
  errorComponent: RouteErrorFallback,
});
