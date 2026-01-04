/**
 * 将 rgba 或 rgb 颜色转换为 hex 颜色
 */
export function colorToHex(color: string): string {
  if (!color || typeof color !== "string") return color;
  if (!color.startsWith("rgb")) return color;

  const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!match) return color;

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

