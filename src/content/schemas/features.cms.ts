import {
  draftCmsField,
  featureItemCmsFields,
  seoCmsFields,
  templateField,
} from "./cms.ts";

export const featuresPageCms = {
  file: "src/content/pages/features.md",
  label: "Features",
  name: "features",
  fields: [
    templateField("features"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    {
      label: "Features",
      name: "features",
      widget: "list",
      fields: featureItemCmsFields,
    },
    draftCmsField,
  ],
};
