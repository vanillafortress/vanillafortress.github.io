import type { CommunityDefinition } from "../core/types";

export default {
  name: "Agartha.tf",
  links: {
    steam: "https://steamcommunity.com/groups/agarthalives/",
    website: "https://agartha.tf",
  },
  servers: [
    {
      name: "Agartha.tf",
      slug: "agartha",
      region: "na",
      ip: "170.23.51.137:22133",
      country: "us",
    },
  ],
} satisfies CommunityDefinition;
