import { useEffect, useState } from "react";
import { ArrowLeft, Check, Fingerprint, Plus, Shield, ShieldCheck, Smartphone, Trash2, UserRound } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

type User = { email: string; full_name?: string; phone?: string; two_factor_enabled?: boolean };
type Passkey = { id: string; transports: string[] };

export default function ProfilePage() {
  const token = localStorage.getItem("finanzia-auth-token") ?? "";
  const [user, setUser] = useState<User | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
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
      if (data.registered) {
        setPasskeys((current) => [...current, { id: credential.id, transports: credential.response.transports ?? [] }]);
        setMessage("Passkey registrada. Ya puedes usarla para iniciar sesión.");
      } else setMessage("No fue posible registrar la Passkey.");
    } catch (passkeyError) { setError(passkeyError instanceof Error ? passkeyError.message : "No fue posible registrar la Passkey."); }
  };
  useEffect(() => {
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: User) => { setUser(data); setFullName(data.full_name ?? ""); setPhone(data.phone ?? ""); })
      .catch(() => setError("No fue posible cargar tu perfil."));
  }, [token]);
  useEffect(() => {
    fetch("/api/auth/passkeys", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: Passkey[]) => setPasskeys(data))
      .catch(() => setError("No fue posible cargar tus Passkeys."));
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
  const disableTwoFactor = async () => {
    const response = await fetch("/api/auth/2fa/disable", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "No fue posible desactivar 2FA."); return; }
    setUser((current) => current ? { ...current, two_factor_enabled: false } : current); setMessage("Verificación 2FA desactivada.");
  };
  const revokePasskey = async (id: string) => {
    setError("");
    const response = await fetch(`/api/auth/passkey/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "No fue posible revocar la Passkey."); return; }
    setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
    setMessage("Passkey revocada correctamente.");
  };
  return <div className="investment-page profile-page"><header className="investment-topbar"><a href="/instituciones" className="back-link"><ArrowLeft size={18} /> Instituciones</a><nav className="investment-nav"><a href="/instituciones">Instituciones</a><a href="/inversiones">Nueva inversión</a><a href="/dashboard">Dashboard</a><a href="/configuracion">Configuración</a><button onClick={() => { localStorage.removeItem("finanzia-auth-token"); window.location.href = "/login"; }}>Cerrar sesión</button></nav></header><main className="investment-content"><div className="investment-intro"><div><span className="eyebrow orange">Cuenta personal</span><h1>Perfil</h1><p>Administra tus datos y seguridad de acceso.</p></div><UserRound size={30} className="configuration-icon" /></div><section className="profile-security-grid"><div className="profile-panel profile-security-panel"><div className="profile-heading"><div className="profile-heading-icon passkey-icon"><Fingerprint size={28} /></div><div><span className="eyebrow profile-accent-green">FIDO2 / WEBAUTHN</span><h2>Passkeys y Dispositivos</h2></div><span className="profile-chip">{passkeys.length} {passkeys.length === 1 ? "Dispositivo" : "Dispositivos"}</span></div><div className="profile-divider" /><p className="profile-lead">Inicia sesión al instante con el sensor biométrico de tu teléfono, Windows Hello, Touch ID o llave de seguridad física.</p>{passkeys.map((passkey) => <div className="device-row" key={passkey.id}><div className="device-icon"><Smartphone size={22} /></div><div className="device-copy"><strong>Dispositivo personal</strong><span>ID: {passkey.id}</span></div><button className="danger-button" type="button" onClick={() => void revokePasskey(passkey.id)}><Trash2 size={16} /> Revocar</button></div>)}<div className="profile-divider profile-divider-spaced" /><button className="primary-button profile-full-button" onClick={() => void registerPasskey()}><Plus size={21} /> Registrar Nueva Passkey en este Dispositivo</button></div><div className="profile-panel profile-security-panel"><div className="profile-heading"><div className="profile-heading-icon two-factor-icon"><Shield size={28} /></div><div><span className="eyebrow profile-accent-violet">DOBLE FACTOR (2FA)</span><h2>Aplicación Autenticadora</h2></div><span className={`profile-chip ${user?.two_factor_enabled ? "profile-chip-active" : ""}`}>{user?.two_factor_enabled ? "2FA Activo" : "2FA Inactivo"}</span></div><div className="profile-divider" />{user?.two_factor_enabled ? <><div className="profile-alert profile-alert-success"><Check size={24} /><span>La verificación en dos pasos (TOTP) está activa y protegiendo tu cuenta.</span></div><button className="secondary-button profile-disable-button" onClick={() => void disableTwoFactor()}>Quitar 2FA</button></> : <><p className="profile-lead">Añade una capa extra de protección usando un código temporal de tu aplicación autenticadora.</p>{secret && <p className="profile-secret">Clave de configuración: <strong>{secret}</strong></p>}<div className="profile-actions"><button className="primary-button" onClick={() => void setupTwoFactor()}><ShieldCheck size={17} /> Preparar 2FA</button>{secret && <><input inputMode="numeric" placeholder="Código de 6 dígitos" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} /><button className="primary-button" onClick={() => void enableTwoFactor()}>Activar 2FA</button></>}</div></>}</div></section><section className="profile-panel profile-personal-panel"><div className="form-panel-heading"><div><span className="eyebrow">Información personal</span><h2>{user?.email ?? "Cargando..."}</h2></div></div><div className="profile-form"><label>Nombre completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label>Teléfono<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><button className="primary-button" onClick={() => void saveProfile()}>Guardar datos</button></div></section>{message && <p className="save-message">{message}</p>}{error && <p className="auth-error">{error}</p>}</main></div>;
}
