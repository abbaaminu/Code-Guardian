import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import {
  RouteErrorFallback,
  RoutePendingFallback,
} from "@/components/route-boundaries";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Global resilience defaults: every route inherits these unless it defines
    // its own errorComponent/pendingComponent.
    defaultErrorComponent: RouteErrorFallback,
    defaultPendingComponent: RoutePendingFallback,
    defaultPendingMs: 300,
  });

  return router;
};
