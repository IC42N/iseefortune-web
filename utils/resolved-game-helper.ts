export function formatEpochRange(first: bigint, last: bigint): string {
  if(first === 0n) return last.toString();

  return first === last || first === 0n
    ? first.toString()
    : `${first.toString()}~${last.toString()}`;
}

export function resolvedGameS3Urls(epoch: bigint, tier: number) {
  const e = epoch.toString();
  const t = String(tier);
  const base = `https://ic42n-resolved-games-prod.s3.us-west-1.amazonaws.com/resolved-games/${e}/`;
  return {
    iJsonUrl: `${base}${t}.json`,
    ticketsUrl: `${base}${t}.tickets.json`,
  };
}


// You can later make this cluster-aware if you have a dev bucket.
function getResolvedGamesBaseUrl(): string {
  return "https://ic42n-resolved-games-prod.s3.us-west-1.amazonaws.com";
}


export function resolvedGameExtrasUrls(args: {
  epoch: bigint;
  tier: number;
}) {
  const { epoch, tier } = args;

  const base = getResolvedGamesBaseUrl().replace(/\/+$/, "");
  const prefix = `/resolved-games/${epoch.toString()}/`;

  return {
    iJsonUrl: `${base}${prefix}${tier}.json`,
    ticketsUrl: `${base}${prefix}${tier}.tickets.json`,
  };
}



export function shortenBlockHash(hash: string, head = 8, tail = 8) {
  if (!hash) return "";
  if (hash.length <= head + tail + 3) return hash.toUpperCase();
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`.toUpperCase();
}
