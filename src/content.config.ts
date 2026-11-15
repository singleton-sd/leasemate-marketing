import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { contactPageSchema } from "./content/schemas/contact";
import { featuresPageSchema } from "./content/schemas/features";
import { homePageSchema } from "./content/schemas/home";
import { pricingPageSchema } from "./content/schemas/pricing";

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.discriminatedUnion("template", [
    homePageSchema,
    featuresPageSchema,
    pricingPageSchema,
    contactPageSchema,
  ]),
});

export const collections = { pages };
