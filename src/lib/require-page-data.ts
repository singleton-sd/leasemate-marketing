import type { CollectionEntry } from "astro:content";

type PageEntry = CollectionEntry<"pages">;
type PageTemplate = PageEntry["data"]["template"];
type PageEntryWithTemplate<T extends PageTemplate> = PageEntry & {
  data: Extract<PageEntry["data"], { template: T }>;
};

/**
 * Asserts a pages collection entry matches the expected `template` literal so
 * TypeScript can narrow the discriminated union from content.config.ts.
 */
export function requirePageEntry<T extends PageTemplate>(
  entry: PageEntry | undefined,
  template: T,
  label = template,
): PageEntryWithTemplate<T> {
  if (!entry) {
    throw new Error(`The ${label} page content entry is missing.`);
  }
  if (entry.data.template !== template) {
    throw new Error(
      `Expected pages/${label} to use template "${template}", got "${entry.data.template}".`,
    );
  }
  return entry as PageEntryWithTemplate<T>;
}

export function requirePageData<T extends PageTemplate>(
  entry: PageEntry | undefined,
  template: T,
  label = template,
): Extract<PageEntry["data"], { template: T }> {
  return requirePageEntry(entry, template, label).data;
}
