import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

type User = { email: string; full_name?: string; phone?: string; two_factor_enabled?: boolean };

export default function ProfilePage() {
  const token = localStorage.getItem("finanzia-auth-token") ?? "";
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const registerPasskey = async () => {
    setMessage("Registrando Passkey..."); setError("");
    try {
      const optionsResponse = await fetch("/api/auth/passkey/register/options", { method: "POST", headers, body: "{}" });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(options.error);
      const credential = await startRegistration({ optionsJSON: options });
      const response = await fetch("/api/auth/passkey/register/verify", { method: "POST", headers, body: JSON.stringify(credential) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(data.registered ? "Passkey registrada. Ya puedes usarla para iniciar sesión." : "No fue posible registrar la Passkey.");
    } catch (passkeyError) { setError(passkeyError instanceof Error ? passkeyError.message : "No fue posible registrar la Passkey."); }
  };
  useEffect(() => {
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: User) => { setUser(data); setFullName(data.full_name ?? ""); setPhone(data.phone ?? ""); })
      .catch(() => setError("No fue posible cargar tu perfil."));
  }, [token]);
  useEffect(() => {
    const container = document.querySelector<HTMLElement>(".profile-secret");
    if (!container || !qrCode) return;
    container.textContent = "";
    const image = document.createElement("img");
    image.src = qrCode;
    image.alt = "Código QR para configurar la aplicación autenticadora";
    container.append(image);
    const caption = document.createElement("span");
    caption.textContent = "Escanea este código QR con tu aplicación autenticadora.";
    container.append(caption);
  }, [qrCode]);
  const saveProfile = async () => {
    const response = await fetch("/api/auth/profile", { method: "PUT", headers, body: JSON.stringify({ full_name: fullName, phone }) });
    setMessage(response.ok ? "Datos personales guardados." : "No fue posible guardar los datos.");
  };
  const setupTwoFactor = async () => {
    const response = await fetch("/api/auth/2fa/setup", { method: "POST", headers, body: "{}" });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "No fue posible preparar 2FA."); return; }
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.otpauthUrl)}`;
    setSecret("QR"); setQrCode(qr); setMessage("Escanea el código QR con tu aplicación autenticadora y escribe el código.");
  };
  const enableTwoFactor = async () => {
    const response = await fetch("/api/auth/2fa/enable", { method: "POST", headers, body: JSON.stringify({ code: twoFactorCode }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Código 2FA incorrecto."); return; }
    setUser((current) => current ? { ...current, two_factor_enabled: true } : current); setSecret(""); setQrCode(""); setMessage("Verificación 2FA activada.");
  };
  const disableTwoFactor = useCallback(async () => {
    const response = await fetch("/api/auth/2fa/disable", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "No fue posible desactivar 2FA."); return; }
    setUser((current) => current ? { ...current, two_factor_enabled: false } : current); setMessage("Verificación 2FA desactivada.");
  }, [token]);
  useEffect(() => {
    const status = document.querySelector<HTMLElement>(".profile-status");
    if (!status || !user?.two_factor_enabled || status.querySelector("button")) return;
    const button = document.createElement("button");
    button.className = "secondary-button profile-disable-2fa";
    button.textContent = "Quitar 2FA";
    button.onclick = () => void disableTwoFactor();
    status.append(button);
  }, [disableTwoFactor, user?.two_factor_enabled]);
  return <div className="investment-page profile-page"><header className="investment-topbar"><a href="/instituciones" className="back-link"><ArrowLeft size={18} /> Instituciones</a><nav className="investment-nav"><a href="/instituciones">Instituciones</a><a href="/inversiones">Nueva inversión</a><a href="/dashboard">Dashboard</a><a href="/configuracion">Configuración</a><button onClick={() => { localStorage.removeItem("finanzia-auth-token"); window.location.href = "/login"; }}>Cerrar sesión</button></nav></header><main className="investment-content"><div className="investment-intro"><div><span className="eyebrow orange">Cuenta personal</span><h1>Perfil</h1><p>Administra tus datos y seguridad de acceso.</p></div><UserRound size={30} className="configuration-icon" /></div><section className="profile-grid"><div className="profile-panel"><div className="form-panel-heading"><div><span className="eyebrow">Información personal</span><h2>{user?.email ?? "Cargando..."}</h2></div></div><div className="profile-form"><label>Nombre completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label>Teléfono<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><button className="primary-button" onClick={() => void saveProfile()}>Guardar datos</button></div></div><div className="profile-panel"><div className="form-panel-heading"><div><span className="eyebrow">Seguridad</span><h2>Acceso seguro</h2></div><ShieldCheck size={24} /></div><button className="secondary-button" onClick={() => void registerPasskey()}>Registrar Passkey</button><div className="profile-divider" />{user?.two_factor_enabled ? <p className="profile-status">2FA está activa en tu cuenta.</p> : <><p className="profile-help">Añade un código temporal de una aplicación autenticadora al iniciar sesión.</p>{secret && <p className="profile-secret">Clave de configuración: <strong>{secret}</strong></p>}<div className="profile-actions"><button className="secondary-button" onClick={() => void setupTwoFactor()}>Preparar 2FA</button>{secret && <><input inputMode="numeric" placeholder="Código de 6 dígitos" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} /><button className="primary-button" onClick={() => void enableTwoFactor()}>Activar 2FA</button></>}</div></>}</div></section>{message && <p className="save-message">{message}</p>}{error && <p className="auth-error">{error}</p>}</main></div>;
}
