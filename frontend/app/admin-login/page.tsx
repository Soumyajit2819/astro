"use client";

import { LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/admin");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/admin");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Login failed.");
      }

      window.location.href = nextPath;
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#f9f1dc_0%,#ecd8af_46%,#d8c39a_100%)] px-4 py-12 text-sage">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute left-[-5rem] top-[-5rem] h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-4rem] h-72 w-72 rounded-full bg-sage/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_32%)]" />
      </div>

      <div className="relative w-full max-w-md rounded-[2rem] border border-gold/25 bg-[linear-gradient(180deg,rgba(255,250,240,0.96),rgba(244,232,204,0.94))] p-8 shadow-[0_28px_90px_rgba(82,98,79,0.16)] backdrop-blur">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-white/70 text-gold">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">Secure Portal</p>
            <h1 className="font-display text-3xl text-sage">Admin Access</h1>
            <p className="mt-1 text-sm text-sage/80">Enter the passcode to manage live website content.</p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-gold/20 bg-white/55 p-4 text-sm leading-6 text-sage/80">
          A calmer cream-and-gold access screen keeps the login readable while matching the spiritual brand.
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-sage">
            Admin passcode
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gold/20 bg-white/75 px-4 py-3 text-sm text-sage outline-none transition placeholder:text-sage/35 focus:border-gold focus:bg-white"
              placeholder="Enter passcode"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-sage px-5 py-3 text-sm font-semibold text-ivory transition hover:bg-sage/90 disabled:opacity-60"
          >
            {loading ? "Checking..." : "Open Admin"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm font-medium text-ember">{error}</p> : null}
      </div>
    </main>
  );
}
