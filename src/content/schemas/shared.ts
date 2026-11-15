import { z } from "astro/zod";

import { approvedInternalRoutes } from "../../lib/approved-internal-routes.ts";

export const internalRoute = z.enum(approvedInternalRoutes);

export const featureItem = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const pageSeo = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  summary: z.string().trim().min(1),
});

export const draftField = z.boolean().default(false);
