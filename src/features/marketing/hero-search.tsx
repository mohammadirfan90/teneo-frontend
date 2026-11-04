"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ANY = "__any"

export function HeroSearch({ cities }: { cities: string[] }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [city, setCity] = useState(ANY)

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (q.trim()) params.set("q", q.trim())
        if (city !== ANY) params.set("city", city)
        const qs = params.toString()
        router.push(qs ? `/rooms?${qs}` : "/rooms")
      }}
      className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm sm:flex-row"
    >
      <label htmlFor="hero-q" className="sr-only">
        Area or building
      </label>
      <Input
        id="hero-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Area or building, e.g. Gulshan"
        className="border-0 shadow-none focus-visible:ring-0 sm:flex-1"
      />
      <Select value={city} onValueChange={setCity}>
        <SelectTrigger className="w-full border-0 shadow-none sm:w-40" aria-label="City">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any city</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="lg" className="sm:h-10">
        <Search /> Search rooms
      </Button>
    </form>
  )
}
