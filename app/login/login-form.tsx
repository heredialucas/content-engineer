"use client";

import { FormEvent, useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "No se pudo iniciar sesión.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("No pudimos conectar con el servidor. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">C</div>
        <p className="eyebrow">CONTENT STUDIO</p>
        <h1>Tu espacio creativo.</h1>
        <p className="muted">Entrá para crear contenido para tus proyectos.</p>
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="password">Contraseña</label>
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-primary button-wide" disabled={busy || !password}>
            {busy ? "Entrando…" : "Entrar al estudio"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="login-footnote">Un lugar simple para todas tus marcas.</p>
      </section>
    </main>
  );
}
