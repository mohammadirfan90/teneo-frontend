import { PublicHeader } from "@/components/layout/public-header"
import { SiteFooter } from "@/components/layout/site-footer"

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PublicHeader />
      <div id="main" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter />
    </>
  )
}
