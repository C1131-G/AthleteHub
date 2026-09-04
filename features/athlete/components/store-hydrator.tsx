"use client";

/**
 * Collections are read through TanStack Query now, which fetches on mount, so
 * there is nothing left to hydrate ahead of the first render. The component
 * stays as the shell's mount point for the one-time import of legacy
 * localStorage data.
 */
import { LegacyImportPrompt } from "@/features/backend/components/legacy-import-prompt";

export const StoreHydrator = () => <LegacyImportPrompt />;
