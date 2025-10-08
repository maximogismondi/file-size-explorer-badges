export type Scale = "log2" | "log10";

export interface Presentation {
  badge: string; // e.g., "9K"
  label: string; // e.g., "95.4 MiB"
}

export function calcPresentation(bytes: number, scale: Scale): Presentation {
  const { value, unit } = toUnit(bytes, scale);
  const label = formatLabel(value, unit);
  const expWithin = withinUnitExponent(value, scale);
  const unitLetter = (unit[0] || "").toUpperCase();
  const badge = expWithin <= 9 ? `${expWithin}${unitLetter}` : unitLetter;
  return { badge, label };
}

function toUnit(bytes: number, scale: Scale) {
  const base = scale === "log2" ? 1024 : 1000;
  const units =
    scale === "log2"
      ? ["B", "KiB", "MiB", "GiB", "TiB"]
      : ["B", "KB", "MB", "GB", "TB"];
  let exp = 0;
  let value = bytes;
  while (value >= base && exp < units.length - 1) {
    value = value / base;
    exp++;
  }
  return { value, unit: units[exp], exp, units, base };
}

function formatLabel(value: number, unit: string): string {
  const rounded =
    value >= 100
      ? value.toFixed(0)
      : value >= 10
      ? value.toFixed(1)
      : value.toFixed(2);
  return `${rounded} ${unit}`;
}

function withinUnitExponent(value: number, scale: Scale): number {
  if (value <= 0) {
    return 0;
  }
  const raw = scale === "log2" ? Math.log2(value) : Math.log10(value);
  const floored = Math.floor(raw);
  return Number.isFinite(floored) && floored >= 0 ? floored : 0;
}
