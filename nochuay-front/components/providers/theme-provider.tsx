"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/use-theme-store";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useThemeStore((state) => state.mode);
  const hydrate = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return <>{children}</>;
}
