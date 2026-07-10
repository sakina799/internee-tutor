"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import AuthNav from "@/components/AuthNav";
import AuthIllustration from "@/components/AuthIllustration";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_center,_#CAF0F8_0%,_#90E0EF_100%)] relative overflow-hidden">
      <AuthNav />

      <div className="relative flex items-center justify-center px-8 py-10 max-w-6xl mx-auto">
        <div className="hidden md:flex flex-1 items-center justify-center">
          <AuthIllustration />
        </div>

        <div className="flex-1 flex justify-center md:justify-start">
          <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
            <h2 className="font-display text-xl font-semibold text-[#03045E] mb-1">
              Student Dashboard
            </h2>
            <p className="text-sm text-[#03045E]/70 mb-6">Log in to your account</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-[#03045E]/70 mb-1 block">
                  Username or Student ID
                </label>
                <input
                  type="email"
                  placeholder="you@internee.pk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-[#90E0EF] rounded-lg px-3 py-2.5 text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                />
              </div>

              <div>
                <label className="text-xs text-[#03045E]/70 mb-1 block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-[#90E0EF] rounded-lg px-3 py-2.5 text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                />
              </div>

              <div className="text-right">
                <span className="text-xs text-[#00B4D8] cursor-pointer">
                  Forgot Password?
                </span>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0077B6] hover:bg-[#00B4D8] text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="text-xs text-[#03045E]/70 text-center mt-6">
              Don't have an account?{" "}
              <a href='/signup' className='text-[#00B4D8] font-medium'>
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}