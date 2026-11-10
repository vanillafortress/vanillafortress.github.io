import type { CommunityDefinition } from "../core/types";

export default {
  name: "Bunny's TF2 Archives",
  links: {
    discord: "https://discord.gg/cAsTmX2exd",
    steam: "https://steamcommunity.com/groups/BTF2A",
  },
  servers: [
    {
      name: "Bunny Archives (Vanilla+)",
      slug: "bunny",
      region: "eu",
      ip: "51.77.46.229:2501",
      country: "pl",
    },
  ],
} satisfies CommunityDefinition;
