export function pickStopCode(
  text: string,
  known?: { has: (code: string) => boolean },
): string | null {
  const compact = text.replace(/\D/g, "");
  if (compact.length < 5) return null;

  const sliding: string[] = [];
  for (let i = 0; i <= compact.length - 5; i++) {
    sliding.push(compact.slice(i, i + 5));
  }
  const unique = [...new Set(sliding)];

  if (known) {
    const hit = unique.find((code) => known.has(code));
    if (hit) return hit;
  }

  if (compact.length === 5) return compact;
  return null;
}
