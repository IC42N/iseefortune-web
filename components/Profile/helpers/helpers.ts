export function epochRangeText(
  gameEpoch: bigint,
  rgResolvedEpoch?: number | bigint | null
): { text: string; span: number | null; start: number; end: number | null } {

  const start = Number(gameEpoch);
  const end = rgResolvedEpoch == null ? null : Number(rgResolvedEpoch);

  if (end == null || Number.isNaN(end)) {
    return { text: `${start}`, span: null, start, end: null };
  }
  if (end <= start) {
    return { text: `${start}`, span: 1, start, end: start };
  }
  return { text: `${start}~${end}`, span: end - start + 1, start, end };
}