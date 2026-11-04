import type { ReactNode } from "react"
import { cn } from "cn"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  align?: "left" | "right"
  /** Hidden in the stacked mobile layout (e.g. secondary metadata). */
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** Primary line in the mobile card (defaults to the first column). */
  mobileTitle?: (row: T) => ReactNode
  /** Trailing element in the mobile card header, e.g. a status badge. */
  mobileAside?: (row: T) => ReactNode
  /** Action cell rendered at the end of desktop rows and the bottom of mobile cards. */
  actions?: (row: T) => ReactNode
  caption?: string
  className?: string
}

/** Table on md+, stacked cards below. Server-renderable (no client state). */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  mobileTitle,
  mobileAside,
  actions,
  caption,
  className,
}: DataTableProps<T>) {
  const [first, ...rest] = columns
  const titleOf = mobileTitle ?? ((row: T) => first?.cell(row))

  return (
    <div className={className}>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader className="bg-surface-2/60">
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    "h-10 px-4 text-[0.8125rem] font-medium text-muted-foreground",
                    c.align === "right" && "text-right",
                    c.className
                  )}
                >
                  {c.header}
                </TableHead>
              ))}
              {actions && (
                <TableHead className="h-10 px-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn("px-4 py-3", c.align === "right" && "text-right tabular-nums", c.className)}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
                {actions && <TableCell className="px-4 py-3 text-right">{actions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-medium">{titleOf(row)}</div>
              {mobileAside && <div className="shrink-0">{mobileAside(row)}</div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {(mobileTitle ? columns : rest)
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{c.header}</dt>
                    <dd className="mt-0.5 truncate tabular-nums">{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
            {actions && <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">{actions(row)}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
