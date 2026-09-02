// IMPORTS

import { stdin as input, stdout as output } from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import { validateServerDirectory } from "../src/data/servers/core/validate";
import { regions } from "../src/data/servers/regions";
import type {
  CommunityDefinition,
  RegionKey,
  ServerLinks,
  Server,
} from "../src/data/servers/core/types";

// TYPES

type CommunityChoice =
  | {
      type: "existing";
      name: string;
      filePath: string;
    }
  | {
      type: "new";
      name: string;
      slug: string;
      filePath: string;
      links?: ServerLinks;
    };

type ServerDraft = Server;

type CommunitySource = CommunityDefinition & {
  filePath: string;
};

// CONSTANTS

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const communitiesPath = resolve(root, "src/data/servers/communities");

const color = { // why is this a constant? -spark
  title: (value: string) => `\x1b[38;5;214m${value}\x1b[0m`,
  accent: (value: string) => `\x1b[38;5;215m${value}\x1b[0m`,
  muted: (value: string) => `\x1b[2m${value}\x1b[0m`,
  success: (value: string) => `\x1b[32m${value}\x1b[0m`,
  warning: (value: string) => `\x1b[33m${value}\x1b[0m`,
  error: (value: string) => `\x1b[31m${value}\x1b[0m`,
  path: (value: string) => `\x1b[36m${value}\x1b[0m`,
  code: (value: string) => `\x1b[90m${value}\x1b[0m`,
};

const pipedAnswers = input.isTTY
  ? undefined
  : readFileSync(0, "utf8").replace(/\r\n/g, "\n").split("\n");
const rl = input.isTTY ? createInterface({ input, output }) : undefined;

// FUNCTIONS

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function formatOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isHttpUrl(value: string) {
  if (value.length === 0) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseServerAddress(value: string): { valid: true } | { valid: false; message: string } {
  const match = value.match(/^\[([^\]]+)\]:(\d{1,5})$/) ?? value.match(/^([^:\s]+):(\d{1,5})$/);

  if (!match) {
    return { valid: false, message: "Please enter an address in host:port format." };
  }

  const host = match[1];
  const port = Number(match[2]);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return { valid: false, message: "Please enter a port between 1 and 65535." };
  }

  const ipVersion = isIP(host);
  if (ipVersion !== 0) {
    return { valid: true };
  }

  if (/^\d+(?:\.\d+){3}$/.test(host)) {
    return { valid: false, message: "Please enter a valid IPv4 address." };
  }

  const labels = host.split(".");
  const validHostname = labels.every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
  );

  if (!validHostname) {
    return { valid: false, message: "Please enter a valid hostname or IP address." };
  }

  return { valid: true };
}

function renderLinks(links?: ServerLinks) {
  if (!links || Object.keys(links).length === 0) {
    return "";
  }

  const entries = Object.entries(links)
    .map(([key, value]) => `    ${key}: "${value}",`)
    .join("\n");

  return `\n  links: {\n${entries}\n  },`;
}

function visibleLength(value: string) {
  return value.replace(/\x1b\[[0-9;]+m/g, "").length;
}

function padVisible(value: string, length: number) {
  const padding = Math.max(0, length - visibleLength(value));
  return `${value}${" ".repeat(padding)}`;
}

function renderCommunityGrid(communities: readonly CommunitySource[]) {
  const terminalWidth = output.columns ?? 80;
  const gap = 4;
  const maxColumns = 3;
  const items = communities.map((community, index) => {
    const serverLabel = `${community.servers.length} ${
      community.servers.length === 1 ? "server" : "servers"
    }`;

    return `${color.accent(`${index + 1}.`)} ${community.name} ${color.muted(`(${serverLabel})`)}`;
  });
  const widestItem = Math.max(...items.map(visibleLength));
  const columnWidth = Math.min(widestItem + gap, terminalWidth);
  const columns = Math.min(maxColumns, Math.max(1, Math.floor(terminalWidth / columnWidth)));
  const rows = Math.ceil(items.length / columns);

  for (let row = 0; row < rows; row += 1) {
    const line = [];

    for (let column = 0; column < columns; column += 1) {
      const item = items[row + column * rows];

      if (item) {
        line.push(padVisible(item, columnWidth));
      }
    }

    console.log(line.join(""));
  }
}

function renderServer(server: ServerDraft, indent = "    ") {
  return [
    `${indent}{`,
    `${indent}  name: ${server.name},`,
    `${indent}  slug: ${server.slug},`,
    `${indent}  region: ${server.region},`,
    `${indent}  ip: ${server.ip},`,
    `${indent}  country: ${server.country},`,
    `${indent}  is_tf2c: ${server.is_tf2c},`,
    `${indent}},`
  ].join('\n');
}

function renderNewCommunity(
  choice: Extract<CommunityChoice, { type: "new" }>,
  servers: ServerDraft[],
) {
  const renderedServers = servers.map((server) => renderServer(server)).join("\n");

  return `import type { CommunityDefinition } from "../core/types";

export default {
  name: "${choice.name}",${renderLinks(choice.links)}
  servers: [
${renderedServers}
  ],
} satisfies CommunityDefinition;
`;
}

async function readCommunitySources() {
  const files = (await readdir(communitiesPath))
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .sort((left, right) => left.localeCompare(right, "en"));

  const communities = await Promise.all(
    files.map(async (file) => {
      const filePath = resolve(communitiesPath, file);
      const module = await import(pathToFileURL(filePath).href) as {
        default: CommunityDefinition;
      };

      return {
        ...module.default,
        filePath,
      };
    }),
  );

  return communities.sort((left, right) => left.name.localeCompare(right.name));
}

async function validateCommunitySources(communities: readonly CommunitySource[]) {
  validateServerDirectory(communities, regions);
}

function validateProposedChanges(
  communities: readonly CommunitySource[],
  community: CommunityChoice,
  servers: ServerDraft[],
) {
  const proposedCommunities = community.type === "new"
    ? [
        ...communities,
        {
          name: community.name,
          links: community.links,
          servers,
          filePath: community.filePath,
        },
      ]
    : communities.map((existingCommunity) =>
        existingCommunity.filePath === community.filePath
          ? {
              ...existingCommunity,
              servers: [...existingCommunity.servers, ...servers],
            }
          : existingCommunity,
      );

  validateServerDirectory(proposedCommunities, regions);
}

function findServersArrayEnd(sourceText: string, filePath: string) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  let insertAt: number | undefined;

  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "servers" &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      insertAt = node.initializer.getEnd() - 1;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (insertAt === undefined) {
    throw new Error(`Could not find a servers array in ${filePath}`);
  }

  return insertAt;
}

async function createCommunityFile(
  community: Extract<CommunityChoice, { type: "new" }>,
  servers: ServerDraft[],
) {
  if (existsSync(community.filePath)) {
    throw new Error(`Community file already exists: ${community.filePath}`);
  }

  await writeFile(community.filePath, renderNewCommunity(community, servers));
}

async function appendServersToCommunity(
  community: Extract<CommunityChoice, { type: "existing" }>,
  servers: ServerDraft[],
) {
  const sourceText = await readFile(community.filePath, "utf8");
  const insertAt = findServersArrayEnd(sourceText, community.filePath);
  const renderedServers = servers.map((server) => renderServer(server)).join("\n");
  const beforeServersEnd = sourceText.slice(0, insertAt).replace(/[ \t]*$/, "");
  const nextSourceText = `${beforeServersEnd}${renderedServers}\n  ${sourceText.slice(insertAt)}`;

  await writeFile(community.filePath, nextSourceText);
}

function getRegionLabel(regionKey: RegionKey) {
  return regions.find((region) => region.key === regionKey)?.label ?? regionKey;
}

function renderPreviewSummary(community: CommunityChoice, servers: ServerDraft[]) {
  const links =
    community.type === "new" && community.links
      ? Object.keys(community.links).join(", ")
      : community.type === "existing"
        ? "existing community links"
        : "none";

  console.log(`${color.muted("Community:")} ${color.accent(community.name)}`);
  console.log(
    `${color.muted("Servers:")} ${servers.length} ${servers.length === 1 ? "server" : "servers"}`,
  );
  console.log(`${color.muted("Links:")} ${links}`);

  servers.forEach((server, index) => {
    const region = `${getRegionLabel(server.region)} ${color.muted(`(${server.region})`)}`;

    console.log(
      `${color.accent(`${index + 1}.`)} ${server.name} ${color.muted("-")} ${region} ${color.muted("-")} ${server.ip} ${color.muted(`(${server.country.toUpperCase()})`)}`,
    );
  });
}

// HELPERS

async function askRequired(question: string) {
  while (true) {
    const answer = (await ask(question)).trim();

    if (answer.length > 0) {
      return answer;
    }

    console.log(color.error("Please enter a value."));
  }
}

async function askUrl(label: keyof ServerLinks) {
  while (true) {
    const answer = (await ask(`${label} link (optional): `)).trim();

    if (isHttpUrl(answer)) {
      return formatOptional(answer);
    }

    console.log(color.error("Please enter an HTTP or HTTPS URL, or leave it blank."));
  }
}

async function askYesNo(question: string, defaultValue = false) {
  while (true) {
    const answer = (await ask(question)).trim().toLowerCase();

    if (answer === "") {
      return defaultValue;
    }

    if (["y", "yes"].includes(answer)) {
      return true;
    }

    if (["n", "no"].includes(answer)) {
      return false;
    }

    console.log(color.error("Please answer yes or no."));
  }
}

async function ask(question: string) {
  if (!pipedAnswers) {
    return rl?.question(question) ?? "";
  }

  const answer = pipedAnswers.shift() ?? "";
  output.write(`${question}${answer}\n`);
  return answer;
}

// CLI

async function askCommunityChoice(communities: readonly CommunitySource[]): Promise<CommunityChoice> {
  console.log(`\n${color.title("Community")}`);
  console.log(`${color.accent("1.")} Add to an existing community`);
  console.log(`${color.accent("2.")} Create a new community`);

  while (true) {
    const answer = (await ask("Choose an option: ")).trim();

    if (answer === "1") {
      renderCommunityGrid(communities);

      while (true) {
        const selection = Number.parseInt(await ask("Community number: "), 10);
        const community = communities[selection - 1];

        if (community) {
          return { type: "existing", name: community.name, filePath: community.filePath };
        }

        console.log(color.error("Please choose one of the listed communities."));
      }
    }

    if (answer === "2") {
      const name = await askRequired("Community name: ");
      const slug = slugify(name);
      const filePath = resolve(communitiesPath, `${slug}.ts`);

      if (!slug) {
        console.log(color.error("Please enter a name that can be used for a file name."));
        continue;
      }

      if (communities.some((community) => community.name.toLowerCase() === name.toLowerCase())) {
        console.log(color.error("That community already exists. Add servers to the existing community instead."));
        continue;
      }

      if (existsSync(filePath)) {
        console.log(color.error(`A community file already exists for ${slug}.`));
        continue;
      }

      const links = {
        website: await askUrl("website"),
        steam: await askUrl("steam"),
        discord: await askUrl("discord"),
      };
      const filteredLinks = Object.fromEntries(
        Object.entries(links).filter(([, value]) => value),
      ) as ServerLinks;

      return {
        type: "new",
        name,
        slug,
        filePath,
        links: Object.keys(filteredLinks).length > 0 ? filteredLinks : undefined,
      };
    }

    console.log(color.error("Please choose 1 or 2."));
  }
}

async function askRegion(): Promise<RegionKey> {
  console.log(`\n${color.title("Region")}`);
  regions.forEach((region) => {
    console.log(`${color.accent(region.key)} ${color.muted("-")} ${region.label}`);
  });

  while (true) {
    const answer = (await ask("Region key: ")).trim().toLowerCase();
    const region = regions.find(
      (item) => item.key === answer || item.label.toLowerCase() === answer,
    );

    if (region) {
      return region.key;
    }

    console.log(color.error("Please choose one of the listed region keys."));
  }
}

async function askServer(usedIps: Set<string>, usedSlugs: Set<string>): Promise<ServerDraft> {
  const name = await askRequired("\nServer name: ");
  const region = await askRegion();

  while (true) {
    const ip = (await ask("Server address (host:port): ")).trim();

    const address = parseServerAddress(ip);

    if (!address.valid) {
      console.log(color.error(address.message));
      continue;
    }

    const slug = await askSlug(usedSlugs);

    if (usedIps.has(ip)) {
      console.log(color.error("That server address already exists in the directory."));
      continue;
    }

    const country = (await askRequired("Country code (two lowercase letters): ")).toLowerCase();
    if (!/^[a-z]{2}$/.test(country)) {
      console.log(color.error("Country must be a two-letter code, such as us or de."));
      continue;
    }

    const is_tf2c = await askTF2C();

    usedIps.add(ip);

    return {
      name,
      slug,
      region,
      ip,
      country,
      is_tf2c
    };
  }
}

async function askServers(usedIps: Set<string>, usedSlugs: Set<string>) {
  const servers: ServerDraft[] = [];

  while (true) {
    servers.push(await askServer(usedIps, usedSlugs));

    if (!(await askYesNo("\nAdd another server? (y/N): "))) {
      return servers;
    }
  }
}

async function askTF2C(): Promise<boolean> {
  return (await askYesNo("Is this server for TF2 Classified?", false))
}

async function askSlug(usedSlugs: Set<string>): Promise<string> {
  while (true) {
    const slug = (await ask("Server slug: ")).trim().toLowerCase();

    if (!isValidSlug(slug)) {
      console.log(
        color.error(
          "Slugs must only contain lowercase letters, numbers, and single hyphens."
        )
      );

      continue;
    }

    if (usedSlugs.has(slug)) {
      console.log(color.error("That server slug already exists. Every slug has to be unique!"));
      continue
    }

    usedSlugs.add(slug);
    return slug;
  }
}

// MAIN

async function main() {
  try {
    console.log(color.title("Vanilla Fortress server helper"));

    const communities = await readCommunitySources();
    await validateCommunitySources(communities);

    const community = await askCommunityChoice(communities);
    const usedIps = new Set(
      communities.flatMap((community) => community.servers.map((server) => server.ip)),
    );
    const usedSlugs = new Set(
      communities.flatMap((community) => community.servers.map((server) => server.slug)),
    );
    const servers = await askServers(usedIps, usedSlugs);

    console.log(`\n${color.title("Preview")}`);
    renderPreviewSummary(community, servers);
    console.log();

    if (community.type === "new") {
      console.log(`Will create ${color.path(`src/data/servers/communities/${community.slug}.ts`)}`);
      console.log(`\n${color.title("Generated community file")}`);
      console.log(color.code(renderNewCommunity(community, servers)));
    } else {
      console.log(`Will append ${servers.length === 1 ? "this server" : "these servers"} to ${color.accent(community.name)}:`);
      console.log(color.code(servers.map((server) => renderServer(server, "  ")).join("\n")));
    }

    validateProposedChanges(communities, community, servers);

    if (!(await askYesNo("\nWrite these changes? (Y/n): ", true))) {
      console.log(color.warning("No files were changed."));
      return;
    }

    if (community.type === "new") {
      await createCommunityFile(community, servers);
    } else {
      await appendServersToCommunity(community, servers);
    }

    console.log(color.success("\nServer directory updated."));

    console.log(`\n${color.title("Next steps")}`);
    console.log(`${color.success("1.")} npm run check`);
    console.log(`${color.success("2.")} npm run build`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ABORT_ERR") {
      console.log("\n\nAborted with Ctrl+C.");
    } else if (error instanceof Error) {
      console.error(color.error("\nSomething went wrong.\n") + error.stack);
    } else {
      console.error(color.error("\nSomething went catastrophically wrong.\n") + error);
    }
  }
}

try {
  await main();
} finally {
  rl?.close();
}
