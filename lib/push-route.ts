import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type PushOptions = Parameters<AppRouterInstance["push"]>[1];

/** Push a route assembled by the app's typed route helpers. */
export const pushRoute = (
  router: AppRouterInstance,
  href: string,
  options?: PushOptions
) => {
  // SAFETY: callers pass URLs created by the app's typed route helpers.
  router.push(href, options);
};
