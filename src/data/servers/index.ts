import { serverDefinitions } from "./definitions";
import { regions } from "./regions";
import type { RegionKey, ServerDefinition, ServerGroup, ServerRegion } from "./core/types";

export type {
  CommunityDefinition,
  RegionDefinition,
  RegionKey,
  ServerDefinition,
  ServerGroup,
  ServerLinks,
  ServerRegion,
} from "./core/types";

export { serverDefinitions } from "./definitions";

const groupsForRegion = (region: RegionKey): ServerGroup[] =>
  serverDefinitions.flatMap((community) => {
    const servers = community.servers.filter(
      (server) =>
        server.region === region
    );

    return servers.length > 0
      ? [{ name: community.name, links: community.links, servers }]
      : [];
  });

const getServerRegions = (): ServerRegion[] =>
  regions
    .map((region) => {
      const groups = groupsForRegion(region.key);

      return {
        ...region,
        groups,
        serverCount: groups.reduce(
          (total, group) => total + group.servers.length,
          0,
        ),
      };
    })
    .filter((region) => region.serverCount > 0);

export const serverRegions = getServerRegions();