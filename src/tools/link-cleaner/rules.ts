const GLOBAL_EXACT_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'ttclid',
  'twclid',
  'li_fat_id',
  'mc_cid',
  'mc_eid',
  'igshid',
  'igsh',
  'spm',
  'spm_id_from',
  'vd_source',
  'from_source',
  'share_source',
  'share_medium',
  'share_plat',
  'share_session_id',
  'share_tag',
  'share_times',
  'srsltid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'vero_id',
  'oly_anon_id',
  'oly_enc_id',
  'ref_src',
  'ref_url',
]);

const GLOBAL_PARAM_PREFIXES = [
  'utm_',
  'hsa_',
  'pk_',
  'mtm_',
  'matomo_',
] as const;

interface HostRule {
  readonly matchHost: (hostname: string) => boolean;
  readonly exactParams?: ReadonlySet<string>;
  readonly prefixes?: readonly string[];
}

function isDomainOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

const HOST_RULES: readonly HostRule[] = [
  {
    matchHost: (host) =>
      isDomainOrSubdomain(host, 'youtube.com') || isDomainOrSubdomain(host, 'youtu.be'),
    exactParams: new Set(['si', 'feature', 'pp']),
  },
  {
    matchHost: (host) => isDomainOrSubdomain(host, 'bilibili.com'),
    exactParams: new Set(['buvid', 'mid', 'up_id', 'unique_k', 'ts', 'is_story_h5']),
  },
  {
    matchHost: (host) =>
      isDomainOrSubdomain(host, 'x.com') || isDomainOrSubdomain(host, 'twitter.com'),
    exactParams: new Set(['s', 't']),
  },
  {
    matchHost: (host) => /(^|\.)amazon\.[a-z.]+$/i.test(host),
    exactParams: new Set([
      'tag',
      'ref',
      'ref_',
      'psc',
      'qid',
      'sr',
      'spla',
      'dib',
      'dib_tag',
      'content-id',
    ]),
    prefixes: ['pf_rd_', 'pd_rd_'],
  },
];

export function isTrackingParam(hostname: string, paramName: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  const normalizedKey = paramName.toLowerCase();

  if (GLOBAL_EXACT_PARAMS.has(normalizedKey)) return true;
  if (GLOBAL_PARAM_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix))) return true;

  for (const rule of HOST_RULES) {
    if (!rule.matchHost(normalizedHost)) continue;
    if (rule.exactParams?.has(normalizedKey)) return true;
    if (rule.prefixes?.some((prefix) => normalizedKey.startsWith(prefix))) return true;
  }

  return false;
}
