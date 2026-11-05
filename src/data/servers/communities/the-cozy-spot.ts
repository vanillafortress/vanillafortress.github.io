import type { CommunityDefinition } from "../core/types";

export default {
  name: "The Cozy Spot",
  links: {
    discord: "https://discord.gg/t8gNHs55tU",
  },
  servers: [
    {
      name: "The Cozy Spot",
      slug: "the-cozy-spot",
      region: "na",
      ip: "150.136.226.38:27015",
      country: "us",
    },
  ],
} satisfies CommunityDefinition;
