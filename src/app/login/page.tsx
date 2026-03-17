"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { saveToken } from "@/lib/auth";

// ── Login Page ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log("Login:", { email, password });
    setError(null);
    setLoading(true);

    try {
      const response = await apiPost<{
        ok: boolean;
        user: { id: string; email: string };
        session?: { access_token: string };
      }>(
        "/auth/login",
        {
          email,
          password,
        },
      );

      // Store the JWT token from session
      if (response.session?.access_token) {
        saveToken(response.session.access_token);
        console.log('Token saved successfully!');
      } else {
        console.warn('No access_token in response:', response);
      }

      router.push("/profile");
    } catch (err: unknown) {
      setError((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Logo */}
      <div className="flex justify-center pt-8">
        <span className="text-[32px] font-bold tracking-tight text-[#1e1e1e]">
          Aura
        </span>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pt-12">
        <h1 className="mb-8 text-center text-[24px] font-semibold text-[#1e1e1e]">
          Welcome back
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-[13px] font-medium text-[#757575]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-lg border border-[#d9d9d9] bg-white px-3 py-2.5 text-[15px] text-[#1e1e1e] placeholder:text-[#b0b0b0] outline-none focus:border-[#fa6460] focus:ring-1 focus:ring-[#fa6460]"
            />
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-[13px] font-medium text-[#757575]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-[#d9d9d9] bg-white px-3 py-2.5 text-[15px] text-[#1e1e1e] placeholder:text-[#b0b0b0] outline-none focus:border-[#fa6460] focus:ring-1 focus:ring-[#fa6460]"
            />
          </div>

          {/* Submit button */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#fa6460] py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#e55550] disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </div>
        </form>

        {/* Register link */}
        <div className="mt-6 text-center">
          <p className="text-[14px] text-[#757575]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#fa6460] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
