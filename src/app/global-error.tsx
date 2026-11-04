"use client"

// Replaces the root layout when it crashes, so it carries its own <html>, <body> and styles.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6f5f1",
          color: "#1c1b18",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <title>Something went wrong · Teneo</title>
        <main style={{ maxWidth: 440, padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0, letterSpacing: "-0.01em" }}>Teneo is having trouble</h1>
          <p style={{ color: "#5f5c54", lineHeight: 1.6 }}>The app failed to start. Reload to try again.</p>
          <button
            onClick={retry}
            style={{
              marginTop: 8,
              height: 40,
              padding: "0 16px",
              border: 0,
              borderRadius: 10,
              background: "#1f5c4a",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  )
}
