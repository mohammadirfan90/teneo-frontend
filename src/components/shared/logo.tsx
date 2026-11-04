import Link from "next/link"
import { cn } from "cn"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <path
        d="M6 12.2 12 7l6 5.2V17a1 1 0 0 1-1 1h-3.2v-3.6h-3.6V18H7a1 1 0 0 1-1-1v-4.8Z"
        className="fill-primary-foreground"
      />
    </svg>
  )
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-[1.0625rem] font-semibold tracking-tight",
        className
      )}
    >
      <LogoMark />
      <span>Teneo</span>
    </Link>
  )
}
