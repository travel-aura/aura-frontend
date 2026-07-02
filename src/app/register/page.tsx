"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ── Register Page ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showNameError, setShowNameError] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") {
      setShowNameError(true);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // backend MVP ignores name for now — we still send it (future-proof)
      const response = await apiPost<{
        ok: boolean;
        user: { id: string; email: string };
        session?: { access_token: string };
      }>(
        "/auth/register",
        {
          name,
          email,
          password,
        },
      );

      if (response.session?.access_token && response.user?.id) {
        login(response.session.access_token, response.user.id);
      }

      router.push("/profile");
    } catch (err: unknown) {
      setError((err as Error).message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      {/* Logo */}
      <div className="flex justify-center pt-8">
        <span className="text-[32px] font-bold tracking-tight text-[#1A1613]">
          Aura
        </span>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pt-12">
        <h1 className="mb-8 text-center text-[24px] font-semibold text-[#1A1613]">
          Create your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-[13px] font-medium text-[#6B5F52]"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowNameError(false);
              }}
              onBlur={() => setShowNameError(name.trim() === "")}
              placeholder="Your name"
              maxLength={10}
              required
              className="w-full rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] placeholder:text-[#A09080] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
            />
            <div className="mt-1 flex items-center justify-between">
              {showNameError && (
                <span className="text-[13px] text-[#ff0000]">
                  Name is required
                </span>
              )}
              <span
                className={`text-[13px] text-[#6B5F52] ${!showNameError ? "ml-auto" : ""}`}
              >
                {name.length}/10
              </span>
            </div>
          </div>

          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-[13px] font-medium text-[#6B5F52]"
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
              className="w-full rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] placeholder:text-[#A09080] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
            />
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-[13px] font-medium text-[#6B5F52]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={6}
              className="w-full rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] placeholder:text-[#A09080] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
            />
            <p className="mt-1 text-[12px] text-[#6B5F52]">
              At least 6 characters
            </p>
          </div>

          {/* Submit button */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#B85C38] py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#A84828] disabled:opacity-60"
            >
              {loading ? "Creating..." : "Sign up"}
            </button>
          </div>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-[14px] text-[#6B5F52]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#B85C38] hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
