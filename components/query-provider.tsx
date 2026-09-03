"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

let browserQueryClient: QueryClient | undefined;

/**
 * Module scope is shared between requests on the server, so a render there
 * always gets its own client. The browser keeps one for the session.
 */
const getQueryClient = () => {
  if (isServer) {
    return new QueryClient();
  }
  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
};

export const QueryProvider = ({
  children,
}: Readonly<{ children: ReactNode }>) => (
  <QueryClientProvider client={getQueryClient()}>
    {children}
  </QueryClientProvider>
);
