import type { CommunityDefinition } from "../core/types";

export default {
  name: "Sunny's Garden",
  links: {
    website: "https://madterminal.org/server.html",
  },
  servers: [
    {
      name: "Sunny's Garden",
      slug: "sunnys-garden",
      region: "na",
      ip: "server.madterminal.org:27015",
      country: "us",
    },
  ],
} satisfies CommunityDefinition;
