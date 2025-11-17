import React from "react"
import ClientMessages from "./ClientMessages"

export default function MessagesPage() {
  return (
    <React.Suspense fallback={<div>Loading messages...</div>}>
      {/* ClientMessages is a client component that uses useSearchParams() */}
      <ClientMessages />
    </React.Suspense>
  )
}
