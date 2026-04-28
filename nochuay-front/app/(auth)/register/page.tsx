"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useUserStore } from "@/store/use-user-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import AuthBrandHeader from "@/components/auth/AuthBrandHeader";

interface SignupResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useUserStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch<SignupResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setAuth(data.token, data.user);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fafafa_0%,#f2f2f2_45%,#ececec_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,#171717_0%,#111111_45%,#0a0a0a_100%)]">
      <div className="w-full max-w-md">
        <AuthBrandHeader
          title="Create an account"
          description="Get started with your Nochuay workspace"
        />

        <Card className="w-full rounded-2xl border-neutral-200/90 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:shadow-black/20">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 rounded-xl border-neutral-300 transition-colors hover:border-neutral-400 focus-visible:ring-2 dark:border-neutral-700 dark:hover:border-neutral-600"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-neutral-300 transition-colors hover:border-neutral-400 focus-visible:ring-2 dark:border-neutral-700 dark:hover:border-neutral-600"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder=""
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-neutral-300 transition-colors hover:border-neutral-400 focus-visible:ring-2 dark:border-neutral-700 dark:hover:border-neutral-600"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-neutral-900 text-white transition-transform hover:bg-neutral-800 active:scale-[0.99] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>

              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-neutral-900 dark:text-neutral-100 underline underline-offset-4 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
