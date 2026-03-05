"use client";

import { useState } from "react";
import Link from "next/link";

// ── Status Bar ─────────────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <div className="relative flex h-[54px] items-end justify-between px-6 pb-2">
      <span className="text-[15px] font-semibold">9:41</span>
      <div className="absolute left-1/2 top-[14px] h-[34px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1.5 text-black">
        <svg className="h-3 w-4" viewBox="0 0 20 14" fill="currentColor">
          <rect x="0" y="7" width="3" height="7" rx="1" />
          <rect x="4.5" y="4.5" width="3" height="9.5" rx="1" />
          <rect x="9" y="2" width="3" height="12" rx="1" />
          <rect x="13.5" y="0" width="3" height="14" rx="1" opacity="0.3" />
        </svg>
        <svg
          className="size-[14px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M1.5 8.5a14 14 0 0 1 21 0" />
          <path d="M5.5 12.5a9 9 0 0 1 13 0" />
          <path d="M9.5 16.5a4.5 4.5 0 0 1 5 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
        <svg
          className="h-[13px] w-[25px]"
          viewBox="0 0 25 13"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
        >
          <rect x="0.6" y="0.6" width="21" height="11.8" rx="2.4" />
          <path d="M22.6 4v5" strokeWidth={2} strokeLinecap="round" />
          <rect x="2" y="2" width="17" height="9" rx="1.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

// ── Login Page ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log("Login:", { email, password });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      <StatusBar />

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
          <div className="pt-4">
            <button
              type="submit"
              className="w-full rounded-lg bg-[#fa6460] py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#e55550]"
            >
              Log in
            </button>
          </div>
        </form>

        {/* Register link */}
        <div className="mt-6 text-center">
          <p className="text-[14px] text-[#757575]">
            Don't have an account?{" "}
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
