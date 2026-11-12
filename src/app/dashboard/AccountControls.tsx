
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountControls() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (!error && data.user) {
        setEmail(data.user.email ?? "");
      }
    }

    loadUser();
  }, []);

  async function handleLogout() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: logoutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (logoutError) {
      setError("Unable to log out. Please try again.");
      setLoading(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const initials = email ? email.substring(0, 1).toUpperCase() : "U";

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700"
        title={email || "Your account"}
      >
        {initials}
      </div>

      <div className="hidden max-w-48 sm:block">
        <p className="truncate text-xs font-medium text-slate-700">
          {email || "Your account"}
        </p>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        {loading ? "Logging out..." : "Log out"}
      </button>
    </div>
  );
}
