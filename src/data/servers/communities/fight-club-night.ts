import type { CommunityDefinition } from "../core/types";

export default {
  name: "Fight Club Night",
  links: {
    steam: "https://steamcommunity.com/groups/FightClubNight",
  },
  servers: [
    {
      name: "Fight Club Night",
      slug: "fight-club",
      region: "na",
      ip: "74.91.120.8:27015",
      country: "us",
    },
  ],
} satisfies CommunityDefinition;
