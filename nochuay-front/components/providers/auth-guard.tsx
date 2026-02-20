"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/use-user-store";

/**
 * Client-side auth guard. Wraps protected layouts to redirect
 * unauthenticated users to /login.
 *
 * Renders nothing until hydration completes and we've confirmed
 * the token exists in localStorage — prevents flash of protected content.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useUserStore((s) => s.token);
  const hydrate = useUserStore((s) => s.hydrate);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Restore token + user from localStorage into Zustand on first mount
    hydrate();

    const stored = localStorage.getItem("token");
    if (!stored) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If token is removed after mount (e.g. logout), redirect immediately
  useEffect(() => {
    if (checked && !token) {
      router.replace("/login");
    }
  }, [token, checked, router]);

  // Don't render anything until we've confirmed auth
  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
