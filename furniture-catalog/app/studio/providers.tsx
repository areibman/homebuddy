'use client';

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useState } from "react";

export function Providers({ url, children }: { url: string; children: React.ReactNode }) {
  const [client] = useState(() => (url ? new ConvexReactClient(url) : null));
  if (!client) {
    return (
      <div className="hb" style={{ padding: 32 }}>
        <h1>Homebuddy is not connected to accounts yet.</h1>
        <p>The Convex URL is missing from the server environment.</p>
      </div>
    );
  }
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
