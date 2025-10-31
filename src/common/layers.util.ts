/**
 * Layer utilities: normalization, mapping and address matching
 */

export const layerKeyToCodeMap: Record<string, 'S' | 'L' | 'M' | 'W'> = {
  stars: 'S',
  looks: 'L',
  moves: 'M',
  worlds: 'W',
};

export function layerKeyToCode(key: string): 'S' | 'L' | 'M' | 'W' | undefined {
  return layerKeyToCodeMap[key as keyof typeof layerKeyToCodeMap];
}

export function normalizeLayerKeys(keys: string[] | undefined): Array<'stars' | 'looks' | 'moves' | 'worlds'> {
  if (!Array.isArray(keys)) return ['stars'];
  const normalized = keys
    .map((k) => (typeof k === 'string' ? k.toLowerCase().trim() : ''))
    .filter((k): k is 'stars' | 'looks' | 'moves' | 'worlds' =>
      k === 'stars' || k === 'looks' || k === 'moves' || k === 'worlds'
    );
  return normalized.length ? normalized : ['stars'];
}

export function dualAddressEqual(a?: { nna_address?: string; name?: string; asset_name?: string }, b?: { nna_address?: string; name?: string; asset_name?: string }): boolean {
  if (!a || !b) return false;
  const aNna = a.nna_address?.trim();
  const bNna = b.nna_address?.trim();
  if (aNna && bNna && aNna === bNna) return true;
  const aName = (a.name || a.asset_name)?.trim();
  const bName = (b.name || b.asset_name)?.trim();
  return !!(aName && bName && aName === bName);
}

/**
 * Build a map of current components from a composite payload.
 * The composite may surface components under composite.components or composite.data.components.
 */
export function buildCurrentByLayer(input: any): Map<'S' | 'L' | 'M' | 'W', { nna?: string; hfn?: string }> {
  const map = new Map<'S' | 'L' | 'M' | 'W', { nna?: string; hfn?: string }>();
  // Accept either a composite object or a components array
  const comps = Array.isArray(input)
    ? input
    : Array.isArray(input?.components)
    ? input.components
    : Array.isArray(input?.data?.components)
    ? input.data.components
    : undefined;
  if (!Array.isArray(comps)) return map;
  for (const c of comps) {
    const code = (c?.layer || c?.layer_type || c?.type) as 'S' | 'L' | 'M' | 'W' | undefined;
    if (!code) continue;
    if (code === 'S' || code === 'L' || code === 'M' || code === 'W') {
      map.set(code, { nna: c?.nna_address || c?.nnaAddress, hfn: c?.name || c?.friendlyName });
    }
  }
  return map;
}

export type LayerKey = 'stars' | 'looks' | 'moves' | 'worlds';

const keyToCode: Record<LayerKey, 'S' | 'L' | 'M' | 'W'> = {
  stars: 'S',
  looks: 'L',
  moves: 'M',
  worlds: 'W',
};

export function normalizeLayerKeys(keys: string[] | undefined): LayerKey[] {
  if (!Array.isArray(keys)) return [] as LayerKey[];
  const allowed = new Set(['stars','looks','moves','worlds']);
  return keys
    .map(k => (typeof k === 'string' ? k.toLowerCase().trim() : k))
    .filter(k => allowed.has(k)) as LayerKey[];
}

export function layerKeyToCode(layer: LayerKey): 'S'|'L'|'M'|'W' {
  return keyToCode[layer];
}

export function dualAddressEqual(a?: {nna_address?: string, name?: string}, b?: {nna_address?: string, name?: string}): boolean {
  if (!a || !b) return false;
  const an = (a.nna_address || '').trim();
  const bn = (b.nna_address || '').trim();
  if (an && bn && an === bn) return true;
  const ah = (a.name || '').trim();
  const bh = (b.name || '').trim();
  if (ah && bh && ah === bh) return true;
  // Cross compare (nna vs name) to be extra tolerant
  if (an && bh && an === bh) return true;
  if (ah && bn && ah === bn) return true;
  return false;
}

export function buildCurrentByLayer(components: any[] | undefined): Map<'S'|'L'|'M'|'W', {nna_address?: string, name?: string}> {
  const map = new Map<'S'|'L'|'M'|'W', {nna_address?: string, name?: string}>();
  if (!Array.isArray(components)) return map;
  for (const comp of components) {
    const code = (comp?.layer || comp?.layer_type || comp?.type) as 'S'|'L'|'M'|'W' | undefined;
    if (!code) continue;
    map.set(code, { nna_address: comp.nna_address || comp.nnaAddress, name: comp.name || comp.friendlyName });
  }
  return map;
}


