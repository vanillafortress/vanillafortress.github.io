export type RegionKey = "eu" | "na" | "sa" | "asia" | "oce" | "af" | "me";

export type RegionDefinition = {
  key: RegionKey;
  label: string;
};

export type ServerLinks = {
  steam?: string;
  discord?: string;
  website?: string;
};

export type ServerDefinition = {
  name: string;
  slug: string
  region: RegionKey;
  ip: string;
  country: string;
};

export type CommunityDefinition = {
  name: string;
  links?: ServerLinks;
  servers: ServerDefinition[];
};


export type ServerGroup = {
  name: string;
  links?: ServerLinks;
  servers: ServerDefinition[];
};

export type ServerRegion = RegionDefinition & {
  groups: ServerGroup[];
  serverCount: number;
};
