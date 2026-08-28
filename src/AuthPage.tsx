import { useState } from "react";
import type { FormEvent } from "react";
import { Fingerprint, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

type Props = { onAuthenticated: (token: string) => void };
type Mode = "login" | "register" | "forgot";

export default function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("reset") ?? "");
  const [isResetting, setIsResetting] = useState(Boolean(resetToken));
  const passkeyLogin = async () => {
    setError(""); setMessage("");
    try {
      const optionsResponse = await fetch("/api/auth/passkey/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const options = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(options.error);
      const credential = await startAuthentication({ optionsJSON: options });
      const response = await fetch("/api/auth/passkey/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credential) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem("finanzia-auth-token", data.token); onAuthenticated(data.token); window.history.replaceState({}, "", "/instituciones");
    } catch (passkeyError) { setError(passkeyError instanceof Error ? passkeyError.message : "No fue posible usar Passkey."); }
  };
  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: resetToken, password }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "No fue posible cambiar la contraseña."); return; }
    setIsResetting(false); setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    const endpoint = mode === "register" ? "/api/auth/register" : mode === "forgot" ? "/api/auth/forgot-password" : "/api/auth/login";
    const body = mode === "forgot" ? { email } : { email, password, twoFactorCode: twoFactorCode || undefined };
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "No fue posible completar la solicitud."); return; }
    if (mode === "forgot") { setMessage(data.resetUrl ? `Enlace de desarrollo: ${data.resetUrl}` : data.message); return; }
    localStorage.setItem("finanzia-auth-token", data.token); onAuthenticated(data.token); window.history.replaceState({}, "", "/instituciones");
  };
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">F</span><span>FINANZIA</span></div><span className="eyebrow orange"><ShieldCheck size={14} /> Entorno protegido</span><h1>{isResetting ? "Nueva contraseña." : mode === "login" ? "Tu patrimonio, bajo control." : mode === "register" ? "Crea tu cuenta." : "Recupera el acceso."}</h1><p className="auth-lead">Gestiona tus instituciones, inversiones y fórmulas de cálculo desde un espacio privado.</p>{!isResetting && mode === "login" && <><button className="passkey-button" type="button" onClick={() => void passkeyLogin()}><Fingerprint size={19} /> Continuar con Passkey <small>Sin correo</small></button><div className="auth-divider"><span>o con contraseña</span></div></>}{mode === "login" && <p className="auth-context">Para entrar con contraseña necesitas una cuenta creada previamente.</p>}{isResetting ? <form onSubmit={resetPassword}><label><KeyRound size={15} /> Nueva contraseña<input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="primary-button auth-submit" type="submit">Cambiar contraseña</button></form> : <form onSubmit={submit}><label><Mail size={15} /> Correo electrónico<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{mode !== "forgot" && <label><KeyRound size={15} /> Contraseña<input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}{mode === "login" && <label><ShieldCheck size={15} /> Código 2FA <span className="optional">opcional</span><input inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} /></label>}<button className="primary-button auth-submit" type="submit">{mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Enviar instrucciones"}</button></form>}{error && <p className="auth-error">{error}</p>}{message && <p className="auth-message">{message}</p>}<div className="auth-links">{mode === "login" && <><button onClick={() => setMode("register")}>Crear cuenta</button><button onClick={() => setMode("forgot")}>¿Olvidaste tu contraseña?</button></>}{mode !== "login" && <button onClick={() => setMode("login")}>Volver a iniciar sesión</button>}</div></section><footer>Finanzia © 2026 · Cifrado de sesión · 2FA disponible</footer></main>;
}
