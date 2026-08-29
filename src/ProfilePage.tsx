import { useEffect, useState } from "react";
import {
  Check,
  Fingerprint,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import NavigationHeader from "./NavigationHeader";
import { normalizeUserProductConfig, notifyUserConfigUpdated, type UserProductConfig } from "./userConfig";
import { userConfigExamples } from "./userConfigExamples";
import { formatInstitutionName, formatProductName } from "./displayNames";

type User = {
  email: string;
  full_name?: string;
  phone?: string;
  two_factor_enabled?: boolean;
};
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
  const [userConfigs, setUserConfigs] = useState<UserProductConfig[]>([]);
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(0);
  const [institutionNames, setInstitutionNames] = useState<Record<string, string>>({});
  const [productNames, setProductNames] = useState<Record<string, Record<string, string>>>({}); // institutionId -> productId -> name;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const registerPasskey = async () => {
    setMessage("Registrando Passkey...");
    setError("");
    try {
      const optionsResponse = await fetch(
        "/api/auth/passkey/register/options",
        { method: "POST", headers, body: "{}" },
      );
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(options.error);
      const credential = await startRegistration({ optionsJSON: options });
      const response = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers,
        body: JSON.stringify(credential),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.registered) {
        setPasskeys((current) => [
          ...current,
          {
            id: credential.id,
            transports: credential.response.transports ?? [],
          },
        ]);
        setMessage("Passkey registrada. Ya puedes usarla para iniciar sesión.");
      } else setMessage("No fue posible registrar la Passkey.");
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error
          ? passkeyError.message
          : "No fue posible registrar la Passkey.",
      );
    }
  };
  useEffect(() => {
    fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: User) => {
        setUser(data);
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
      })
      .catch(() => setError("No fue posible cargar tu perfil."));
  }, [token]);
  useEffect(() => {
    fetch("/api/auth/passkeys", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Passkey[]) => setPasskeys(data))
      .catch(() => setError("No fue posible cargar tus Passkeys."));
  }, [token]);
  useEffect(() => {
    const loadConfigs = async () => {
      const exampleMap = new Map<string, UserProductConfig>();
      const institutionNameMap: Record<string, string> = {};
      const productNameMap: Record<string, Record<string, string>> = {};
      
      // 1. Agregar todos los ejemplos hardcodeados
      userConfigExamples.forEach((example) => {
        const key = `${example.institutionId}::${example.productId}`;
        exampleMap.set(key, normalizeUserProductConfig(example));
        if (!institutionNameMap[example.institutionId]) {
          institutionNameMap[example.institutionId] = formatInstitutionName(example.institutionId);
        }
        if (!productNameMap[example.institutionId]) {
          productNameMap[example.institutionId] = {};
        }
        if (!productNameMap[example.institutionId][example.productId]) {
          productNameMap[example.institutionId][example.productId] = formatProductName(example.productId);
        }
      });
      
      // 2. Cargar instituciones dinámicas del usuario
      try {
        const institutionsResponse = await fetch("/api/institutions", { headers });
        if (institutionsResponse.ok) {
          const institutions = await institutionsResponse.json();
          
          // Para cada institución y producto, crear config default si no existe
          institutions.forEach((institution: { id: string; name?: string; products?: Array<{ id: string; name?: string }> }) => {
            institutionNameMap[institution.id] = formatInstitutionName(institution.id, institution.name);

            if (!productNameMap[institution.id]) {
              productNameMap[institution.id] = {};
            }

            if (institution.products && Array.isArray(institution.products)) {
              institution.products.forEach((product: { id: string; name?: string }) => {
                const key = `${institution.id}::${product.id}`;

                productNameMap[institution.id][product.id] = formatProductName(product.id, product.name);

                if (!exampleMap.has(key)) {
                  exampleMap.set(key, normalizeUserProductConfig({
                    institutionId: institution.id,
                    productId: product.id,
                    annualRate: 0,
                    promoCap: 0,
                    excessRate: 0,
                    calculationMethod: "compound",
                    taxRate: 0,
                    daysBase: 365,
                    promotionDays: 60,
                    isActive: true,
                  }));
                }
              });
            }
          });
        }
      } catch {
        // Si falla, continúa con ejemplos
      }
      
      // 3. Cargar configuraciones guardadas del usuario y sobrescribir
      try {
        const userConfigResponse = await fetch("/api/user-config", { headers });
        if (userConfigResponse.ok) {
          const userConfigs = await userConfigResponse.json();
          userConfigs.forEach((userConfig: UserProductConfig) => {
            const key = `${userConfig.institutionId}::${userConfig.productId}`;
            exampleMap.set(key, userConfig);
          });
        }
      } catch {
        // Si falla, continúa con lo que tenemos
      }
      
      const configs = Array.from(exampleMap.values()).filter((config) => Boolean(institutionNameMap[config.institutionId]));
      setUserConfigs(configs);
      setInstitutionNames(institutionNameMap);
      setProductNames(productNameMap);
      setSelectedConfigIndex(0);
    };
    
    loadConfigs();
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
    caption.textContent =
      "Escanea este código QR con tu aplicación autenticadora.";
    container.append(caption);
  }, [qrCode]);
  const saveProfile = async () => {
    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers,
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    setMessage(
      response.ok
        ? "Datos personales guardados."
        : "No fue posible guardar los datos.",
    );
  };
  const orderedConfigs = [...userConfigs].sort((left, right) => {
    // Orden preferido de instituciones
    const institutionOrder: Record<string, number> = {
      "mifel": 1,
      "openbank": 2,
      "nu": 3,
      "didi-cuenta": 4,
      "kubo": 5,
    };
    
    const leftOrder = institutionOrder[left.institutionId.toLowerCase()] ?? 99;
    const rightOrder = institutionOrder[right.institutionId.toLowerCase()] ?? 99;
    
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.productId.localeCompare(right.productId, "es", { sensitivity: "base" });
  });

  const getAvailableCalculationMethods = (institutionId: string) => {
    const methods: Array<{ value: string; label: string }> = [];
    
    const lowerInstitution = institutionId.toLowerCase();
    
    // Métodos genéricos disponibles para todas las instituciones
    methods.push(
      { value: "compound", label: "Interés compuesto (365)" },
      { value: "simple", label: "Interés simple (365)" },
      { value: "simple360", label: "Interés simple (360)" }
    );
    
    // Métodos específicos por institución
    if (lowerInstitution === "mifel") {
      methods.push({ value: "mifel360", label: "Mifel (360)" });
    } else if (lowerInstitution === "openbank") {
      methods.push({ value: "openbank", label: "Openbank (tiered)" });
    } else if (lowerInstitution === "kubo") {
      methods.push({ value: "kubo", label: "Kubo financiero" });
    }
    
    // Método flexible disponible para todas
    methods.push({ value: "flexible", label: "Ultra flexible" });
    
    return methods;
  };
  const selectedConfig = orderedConfigs[selectedConfigIndex] ?? orderedConfigs[0] ?? userConfigExamples[0];
  const updateSelectedConfig = <K extends keyof UserProductConfig>(key: K, value: UserProductConfig[K]) => {
    setUserConfigs((current) => current.map((config, index) => index === selectedConfigIndex ? { ...config, [key]: value } : config));
  };
  const saveUserConfig = async () => {
    if (!selectedConfig) return;
    const payload = normalizeUserProductConfig(selectedConfig);
    const response = await fetch("/api/user-config", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => payload);
    if (!response.ok) {
      setError(data.error ?? "No fue posible guardar la configuración del usuario.");
      return;
    }
    setUserConfigs((current) => current.map((config, index) => index === selectedConfigIndex ? normalizeUserProductConfig({ ...payload, ...data }) : config));
    notifyUserConfigUpdated();
    setMessage("Configuración del usuario guardada.");
  };
  const setupTwoFactor = async () => {
    const response = await fetch("/api/auth/2fa/setup", {
      method: "POST",
      headers,
      body: "{}",
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "No fue posible preparar 2FA.");
      return;
    }
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.otpauthUrl)}`;
    setSecret("QR");
    setQrCode(qr);
    setMessage(
      "Escanea el código QR con tu aplicación autenticadora y escribe el código.",
    );
  };
  const enableTwoFactor = async () => {
    const response = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers,
      body: JSON.stringify({ code: twoFactorCode }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Código 2FA incorrecto.");
      return;
    }
    setUser((current) =>
      current ? { ...current, two_factor_enabled: true } : current,
    );
    setSecret("");
    setQrCode("");
    setMessage("Verificación 2FA activada.");
  };
  const disableTwoFactor = async () => {
    const response = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "No fue posible desactivar 2FA.");
      return;
    }
    setUser((current) =>
      current ? { ...current, two_factor_enabled: false } : current,
    );
    setMessage("Verificación 2FA desactivada.");
  };
  const revokePasskey = async (id: string) => {
    setError("");
    const response = await fetch(
      `/api/auth/passkey/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "No fue posible revocar la Passkey.");
      return;
    }
    setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
    setMessage("Passkey revocada correctamente.");
  };
  return (
    <div className="investment-page profile-page">
      <NavigationHeader pageLabel="Protección" />
      <main className="investment-content">
        <div className="investment-intro">
          <div>
            <span className="eyebrow orange">Cuenta personal</span>
            <h1>Protección</h1>
            <p>Administra tus datos y seguridad de acceso.</p>
          </div>
          <UserRound size={30} className="configuration-icon" />
        </div>
        <section className="profile-panel config-section" style={{ marginBottom: "1.5rem" }}>
          <div className="profile-heading">
            <div className="profile-heading-icon config-icon">
              <ShieldCheck size={28} />
            </div>
            <div>
              <span className="eyebrow profile-accent-green">Configuración personal</span>
              <h2>Ajusta tasas y parámetros</h2>
            </div>
          </div>
          <div className="profile-divider" />
          <div className="config-tabs">
            {(() => {
              let currentInstitution = "";
              return orderedConfigs.map((config, index) => {
                const showDivider = currentInstitution && currentInstitution !== config.institutionId;
                currentInstitution = config.institutionId;
                const institutionName = formatInstitutionName(config.institutionId, institutionNames[config.institutionId]);
                const productName = formatProductName(config.productId, productNames[config.institutionId]?.[config.productId]);
                
                return (
                  <button
                    key={`${config.institutionId}-${config.productId}`}
                    className={`config-tab ${selectedConfigIndex === index ? "active" : ""}${showDivider ? " with-divider" : ""}`}
                    onClick={() => setSelectedConfigIndex(index)}
                    style={showDivider ? { marginLeft: "0.75rem", paddingLeft: "0.75rem", borderLeft: "1px solid var(--color-border, #e5e7eb)" } : {}}
                  >
                    <strong>{institutionName}</strong>
                    <span>{productName}</span>
                  </button>
                );
              });
            })()}
          </div>
          {selectedConfig && (
            <div className="config-form">
              <div className="config-grid">
                <div className="config-field">
                  <label>
                    <span className="label-title">Tasa anual (%)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedConfig?.annualRate ?? 0}
                      onChange={(event) => updateSelectedConfig("annualRate", Number(event.target.value) || 0)}
                    />
                  </label>
                  <small>Rendimiento anual en porcentaje</small>
                </div>
                <div className="config-field">
                  <label>
                    <span className="label-title">Tope promocional</span>
                    <input
                      type="number"
                      step="100"
                      value={selectedConfig?.promoCap ?? 0}
                      onChange={(event) => updateSelectedConfig("promoCap", Number(event.target.value) || 0)}
                    />
                  </label>
                  <small>Monto máximo con tasa promocional</small>
                </div>
                <div className="config-field">
                  <label>
                    <span className="label-title">Tasa excedente (%)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedConfig?.excessRate ?? 0}
                      onChange={(event) => updateSelectedConfig("excessRate", Number(event.target.value) || 0)}
                    />
                  </label>
                  <small>Tasa para montos fuera del tope</small>
                </div>
                <div className="config-field">
                  <label>
                    <span className="label-title">Retención fiscal (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedConfig?.taxRate ?? 0}
                      onChange={(event) => updateSelectedConfig("taxRate", Number(event.target.value) || 0)}
                    />
                  </label>
                  <small>Impuesto retenido en ganancias</small>
                </div>
                <div className="config-field">
                  <label>
                    <span className="label-title">Días base (año)</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={selectedConfig?.daysBase ?? 365}
                      onChange={(event) => updateSelectedConfig("daysBase", Math.max(1, Number(event.target.value) || 365))}
                    />
                  </label>
                  <small>Días en el año comercial (365 ó 360)</small>
                </div>
                <div className="config-field">
                  <label>
                    <span className="label-title">Días de promoción</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={selectedConfig?.promotionDays ?? 60}
                      onChange={(event) => updateSelectedConfig("promotionDays", Math.max(0, Number(event.target.value) || 60))}
                    />
                  </label>
                  <small>Duración de la tasa promocional</small>
                </div>
                <div className="config-field">
                  <label>
                    <span className="label-title">Método de cálculo</span>
                    <select
                      value={selectedConfig?.calculationMethod ?? "compound"}
                      onChange={(event) => updateSelectedConfig("calculationMethod", event.target.value as UserProductConfig["calculationMethod"])}
                    >
                      {getAvailableCalculationMethods(selectedConfig?.institutionId ?? "").map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>Fórmula para calcular ganancias</small>
                </div>
                <div className="config-field full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedConfig?.isActive ?? true}
                      onChange={(event) => updateSelectedConfig("isActive", event.target.checked)}
                    />
                    <span>Producto activo</span>
                  </label>
                  <small>Desactiva este producto temporalmente si es necesario</small>
                </div>
              </div>
              <div className="config-actions">
                <button className="primary-button" onClick={() => void saveUserConfig()}>
                  Guardar cambios
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="profile-security-grid">
          <div className="profile-panel profile-security-panel">
            <div className="profile-heading">
              <div className="profile-heading-icon passkey-icon">
                <Fingerprint size={28} />
              </div>
              <div>
                <span className="eyebrow profile-accent-green">
                  FIDO2 / WEBAUTHN
                </span>
                <h2>Passkeys y Dispositivos</h2>
              </div>
              <span className="profile-chip">
                {passkeys.length}{" "}
                {passkeys.length === 1 ? "Dispositivo" : "Dispositivos"}
              </span>
            </div>
            <div className="profile-divider" />
            <p className="profile-lead">
              Inicia sesión al instante con el sensor biométrico de tu teléfono,
              Windows Hello, Touch ID o llave de seguridad física.
            </p>
            {passkeys.map((passkey) => (
              <div className="device-row" key={passkey.id}>
                <div className="device-icon">
                  <Smartphone size={22} />
                </div>
                <div className="device-copy">
                  <strong>Dispositivo personal</strong>
                  <span>ID: {passkey.id}</span>
                </div>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => void revokePasskey(passkey.id)}
                >
                  <Trash2 size={16} /> Revocar
                </button>
              </div>
            ))}
            <div className="profile-divider profile-divider-spaced" />
            <button
              className="primary-button profile-full-button"
              onClick={() => void registerPasskey()}
            >
              <Plus size={21} /> Registrar Nueva Passkey en este Dispositivo
            </button>
          </div>
          <div className="profile-panel profile-security-panel">
            <div className="profile-heading">
              <div className="profile-heading-icon two-factor-icon">
                <Shield size={28} />
              </div>
              <div>
                <span className="eyebrow profile-accent-violet">
                  DOBLE FACTOR (2FA)
                </span>
                <h2>Aplicación Autenticadora</h2>
              </div>
              <span
                className={`profile-chip ${user?.two_factor_enabled ? "profile-chip-active" : ""}`}
              >
                {user?.two_factor_enabled ? "2FA Activo" : "2FA Inactivo"}
              </span>
            </div>
            <div className="profile-divider" />
            {user?.two_factor_enabled ? (
              <>
                <div className="profile-alert profile-alert-success">
                  <Check size={24} />
                  <span>
                    La verificación en dos pasos (TOTP) está activa y
                    protegiendo tu cuenta.
                  </span>
                </div>
                <button
                  className="secondary-button profile-disable-button"
                  onClick={() => void disableTwoFactor()}
                >
                  Quitar 2FA
                </button>
              </>
            ) : (
              <>
                <p className="profile-lead">
                  Añade una capa extra de protección usando un código temporal
                  de tu aplicación autenticadora.
                </p>
                {secret && (
                  <p className="profile-secret">
                    Clave de configuración: <strong>{secret}</strong>
                  </p>
                )}
                <div className="profile-actions">
                  <button
                    className="primary-button"
                    onClick={() => void setupTwoFactor()}
                  >
                    <ShieldCheck size={17} /> Preparar 2FA
                  </button>
                  {secret && (
                    <>
                      <input
                        inputMode="numeric"
                        placeholder="Código de 6 dígitos"
                        value={twoFactorCode}
                        onChange={(event) =>
                          setTwoFactorCode(event.target.value)
                        }
                      />
                      <button
                        className="primary-button"
                        onClick={() => void enableTwoFactor()}
                      >
                        Activar 2FA
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
        <section className="profile-panel profile-personal-panel">
          <div className="form-panel-heading">
            <div>
              <span className="eyebrow">Información personal</span>
              <h2>{user?.email ?? "Cargando..."}</h2>
            </div>
          </div>
          <div className="profile-form">
            <label>
              Nombre completo
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <label>
              Teléfono
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <button
              className="primary-button"
              onClick={() => void saveProfile()}
            >
              Guardar datos
            </button>
          </div>
        </section>
        {message && <p className="save-message">{message}</p>}
        {error && <p className="auth-error">{error}</p>}
      </main>
    </div>
  );
}
