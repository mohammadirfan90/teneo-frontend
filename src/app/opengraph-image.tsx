import { ImageResponse } from "next/og"

export const alt = "Teneo — verified rooms, roommates and rent in one place"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#f6f5f1",
        color: "#1c1b18",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#1f5c4a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24">
            <path
              d="M6 12.2 12 7l6 5.2V17a1 1 0 0 1-1 1h-3.2v-3.6h-3.6V18H7a1 1 0 0 1-1-1v-4.8Z"
              fill="#ffffff"
            />
          </svg>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Teneo</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, maxWidth: 920 }}>
          Rent a verified room without the guesswork
        </div>
        <div style={{ fontSize: 30, color: "#5f5c54", maxWidth: 900 }}>
          Identity-checked owners, digital leases and rent paid by card — in Dhaka and Chattogram.
        </div>
      </div>
      <div style={{ display: "flex", height: 8, width: 160, background: "#1f5c4a", borderRadius: 4 }} />
    </div>,
    size
  )
}
