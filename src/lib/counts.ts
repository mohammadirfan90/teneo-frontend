import type { Page } from "@/types/api"

/** The backend returns no totals. Show "20+" when another page exists instead of inventing a number. */
export function countLabel(page: Page<unknown>, filtered?: number): string {
  const n = filtered ?? page.items.length
  return page.nextCursor ? `${n}+` : String(n)
}
