/** "Flat 4B · floor 3", "Ground floor", "Flat 2". */
export function flatLabel(f: { floor: number | null; doorNumber: string | null }): string {
  const floor = f.floor === null ? null : f.floor === 0 ? "ground floor" : `floor ${f.floor}`
  if (f.doorNumber && floor) return `Flat ${f.doorNumber} · ${floor}`
  if (f.doorNumber) return `Flat ${f.doorNumber}`
  if (floor) return floor.charAt(0).toUpperCase() + floor.slice(1)
  return "Unnumbered flat"
}

/** flatLabel for use mid-sentence: "Flat 4B · floor 3" → "flat 4B · floor 3". */
export function flatLabelInline(f: { floor: number | null; doorNumber: string | null }): string {
  const s = flatLabel(f)
  return s.charAt(0).toLowerCase() + s.slice(1)
}
