"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  if (!authLoading && user) {
    router.replace("/");
    return null;
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/",
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al conectar con Google";
      setError(message);
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
      } else {
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres");
          setSubmitting(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
        } else {
          setSuccessMsg(
            "Registro exitoso! Revisa tu email para verificar tu cuenta."
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setIsLogin((prev) => !prev);
    setError(null);
    setSuccessMsg(null);
  }

  const googleButton = (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={googleLoading}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 font-medium text-slate-700 shadow-sm active:bg-slate-50 hover:bg-slate-50 transition-colors"
    >
      {googleLoading ? (
        "Conectando..."
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continuar con Google
        </>
      )}
    </button>
  );

  const divider = (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-medium text-slate-400">o con email</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );

  const emailForm = (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] outline-none focus:border-primary/40 transition-colors"
          placeholder="Email"
        />

        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? "current-password" : "new-password"}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] outline-none focus:border-primary/40 transition-colors"
          placeholder="Contraseña"
        />

        {!isLogin && (
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] outline-none focus:border-primary/40 transition-colors"
            placeholder="Nombre completo"
          />
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-white active:bg-primary/90 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting
            ? isLogin ? "Iniciando sesion..." : "Registrando..."
            : isLogin ? "Iniciar sesion" : "Registrarse"}
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {successMsg && <p className="text-sm text-emerald-600 text-center">{successMsg}</p>}
      </form>

      <p className="mt-4 text-center text-sm text-slate-400">
        {isLogin ? "No tienes cuenta? " : "Ya tienes cuenta? "}
        <button type="button" onClick={toggleMode} className="font-bold text-primary">
          {isLogin ? "Registrarse" : "Iniciar sesion"}
        </button>
      </p>
    </>
  );

  return (
    <>
      {/* ── MOBILE: bottom-sheet layout ──────────────────────────── */}
      <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-hidden sm:hidden" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
          <img src="/logo.png" alt="Cattory" className="size-20 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Cattory</h1>
          <p className="text-sm text-slate-400">Gestiona tus tareas en equipo</p>
        </div>
        <div className="shrink-0 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-6 pt-6 pb-6">
          {googleButton}
          {divider}
          {emailForm}
        </div>
      </div>

      {/* ── DESKTOP: centered card layout ────────────────────────── */}
      <div className="fixed inset-0 hidden sm:flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm mx-4">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="Cattory" className="size-16 mb-3" />
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Cattory</h1>
            <p className="text-sm text-slate-400">Gestiona tus tareas en equipo</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 px-6 py-6">
            {googleButton}
            {divider}
            {emailForm}
          </div>
        </div>
      </div>
    </>
  );
}
