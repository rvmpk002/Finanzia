import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import InvestmentPage from "./InvestmentPage";
import DashboardPage from "./DashboardPage";
import AuthPage from "./AuthPage";
import ProfilePage from "./ProfilePage";
import ReportsPage from "./ReportsPage";
import ConfigurationPage from "./ConfigurationPage";
import NavigationHeader from "./NavigationHeader";
import { canonicalizeProductPromoCap, mergeUserProductConfig } from "./userConfig";
import { validateInstitutionInput } from "./validation";
import { institutionIdsFrom, pruneInstitutionRecords } from "./institutionCleanup";
import "./App.css";

type RateProduct = {
  id: string;
  name: string;
  badge?: string;
  description: string;
  conditions: string[];
  icon: "account" | "flexible" | "fixed";
  website?: string;
  promoCap?: number;
  annualRate?: number;
  excessRate?: number;
  calculationMethod?: "compound" | "simple" | "simple360" | "flexible" | "openbank" | "mifel360" | "kubo";
  taxRate?: number;
  daysBase?: number;
  promotionDays?: number;
  allowManualUpdatedBalanceOverride?: boolean;
};
type Institution = {
  id: string;
  name: string;
  country: string;
  category: string;
  website: string;
  notes: string;
  products: RateProduct[];
};

const bancoPlata: Institution = {
  id: "banco-plata",
  name: "Banco Plata",
  country: "México",
  category: "Banca digital",
  website: "https://platacard.mx",
  notes: "Banco Plata con dos productos canónicos: Ahorro Flexible Ultra al 15% y Ahorro Fijo al 11%.",
  products: [
    {
      id: "ahorro-flexible",
      name: "Ahorro Flexible",
      badge: "Ultra",
      description: "15% anual en los primeros $25,000.",
      annualRate: 15,
      promoCap: 25000,
      calculationMethod: "flexible",
      daysBase: 360,
      promotionDays: 60,
      conditions: [
        "15% anual en los primeros $25,000.",
        "Rendimientos diarios con la regla promocional de 60 días.",
      ],
      icon: "flexible",
    },
    {
      id: "ahorro-fijo",
      name: "Ahorro Fijo",
      description: "11% anual fijo.",
      annualRate: 11,
      calculationMethod: "simple360",
      daysBase: 360,
      conditions: ["11% anual fijo en el saldo invertido."],
      icon: "fixed",
    },
  ],
};
const openbank: Institution = {
  id: "openbank",
  name: "Openbank",
  country: "México",
  category: "Banca digital",
  website: "https://www.openbank.mx",
  notes:
    "Rendimientos anuales fijos. Información calculada al 27 de julio de 2026 y vigente al 27 de enero de 2027.",
  products: [
    {
      id: "openbank",
      name: "Ahorro Open",
      description:
        "13% anual sobre los primeros $30,000, 7% anual sobre el exceso hasta $1,000,000 y 6.5% anual sobre el monto restante.",
      annualRate: 13,
      promoCap: 30000,
      excessRate: 7,
      calculationMethod: "openbank",
      daysBase: 360,
      conditions: [
        "Primeros $30,000: 13% anual",
        "Más de $30,000 a $1,000,000: 7% anual",
        "Más de $1,000,000: 6.5% anual",
      ],
      icon: "account",
    },
  ],
};
const nu: Institution = {
  id: "nu",
  name: "Nu",
  country: "México",
  category: "Banca digital",
  website: "https://nubank.com.mx/cuenta/",
  notes:
    "Cajita Turbo con rendimiento fijo del 13% anual y base diaria lineal para tu saldo disponible.",
  products: [
    {
      id: "nu-cajita-turbo",
      name: "Cajita Turbo",
      description: "13% de rendimiento anual fijo.",
      annualRate: 13,
      promoCap: 0,
      excessRate: 0,
      calculationMethod: "compound",
      allowManualUpdatedBalanceOverride: true,
      conditions: [
        "Rendimiento anual fijo del 13%.",
        "La base crece de forma lineal cada día.",
        "Se mantiene el saldo actualizado editado por el usuario.",
      ],
      icon: "flexible",
    },
  ],
};
const didiCuenta: Institution = {
  id: "didi-cuenta",
  name: "DiDi Cuenta",
  country: "México",
  category: "Sociedad financiera popular",
  website: "https://web.didiglobal.com/mx/jpsofiexpress/didi-cuenta/",
  notes:
    "Cuenta digital operada por J.P. Sofiexpress, supervisada por la CNBV y con protección del Fondo de Protección.",
  products: [
    {
      id: "didi-cuenta",
      name: "DiDi Cuenta",
      description:
        "15% anual sobre los primeros $10,000 MXN y 7.5% anual sobre el excedente.",
      conditions: [
        "Monto hasta MXN$10,000: GAT Nominal 16.18% · GAT Real 11.99%",
        "Monto restante: GAT Nominal 7.79% · GAT Real 3.90%",
        "Rendimientos calculados diariamente sobre el saldo disponible.",
      ],
      icon: "account",
      promoCap: 10000,
      annualRate: 15,
      excessRate: 7.5,
      calculationMethod: "compound",
    },
  ],
};
const mifel: Institution = {
  id: "mifel",
  name: "Mifel",
  country: "México",
  category: "Banca digital",
  website: "https://www.mifel.com.mx/personas/cuentas/cuenta-digital",
  notes:
    "Cuenta Digital Mifel con tasa del 10% anual, rendimientos diarios y saldo máximo de $500,000 MXN.",
  products: [
    {
      id: "mifel-cuenta-digital",
      name: "Cuenta Digital Mifel",
      description: "Tasa del 10% anual con rendimientos diarios. A partir de $100.",
      annualRate: 10,
      calculationMethod: "mifel360",
      taxRate: 9,
      daysBase: 360,
      promoCap: 500000,
      conditions: [
        "Tasa del 10% anual con rendimientos diarios. A partir de $100",
        "Aumenta los depósitos mensuales hasta $500,000 pesos.",
        "Límite de $500,000 pesos respetando la tasa del 10% anual",
        "Evoluciona tu cuenta completando tu expediente desde la app",
        "Consulta comisiones aplicables.",
      ],
      website:
        "https://www.mifel.com.mx/personas/cuentas/cuenta-digital?meta.slug=cuenta-digital-evoluciona",
      icon: "flexible",
    },
  ],
};
const kubo: Institution = {
  id: "kubo",
  name: "Kubo Financiero",
  country: "México",
  category: "Sociedad financiera popular",
  website: "https://www.kubofinanciero.com/",
  notes: "Kubo con un único producto: plazo de 1 a 4 días con tasa del 10% anual.",
  products: [
    {
      id: "kubo-liquidez",
      name: "Plazo 1-4 días",
      description: "10.00% anual para plazos de 1 a 4 días.",
      annualRate: 10,
      calculationMethod: "kubo",
      conditions: [
        "Tasa del 10% anual.",
        "Plazo de 1 a 4 días.",
      ],
      icon: "fixed",
    },
  ],
};
const mercadoPago: Institution = {
  id: "mercado-pago",
  name: "Mercado Pago",
  country: "México",
  category: "Cuenta digital",
  website: "https://www.mercadopago.com.mx/",
  notes:
    "Cuenta Mercado Pago con tasa preferencial del 12% anual hasta $25,000 y depósito mensual de $3,000 para conservarla.",
  products: [
    {
      id: "mercado-pago",
      name: "Rendimiento",
      description: "12% anual hasta $25,000 con ganancias diarias.",
      annualRate: 12,
      promoCap: 25000,
      excessRate: 0,
      calculationMethod: "compound",
      conditions: [
        "Tasa anual del 12% sobre los primeros $25,000.",
        "Se requiere un depósito mensual de $3,000 para conservar la tasa preferencial.",
        "Rendimientos diarios acumulados sobre el saldo disponible.",
        "Sin regla de compras ni transferencias mensuales.",
      ],
      icon: "account",
    },
  ],
};
const cetesDirecto: Institution = {
  id: "cetesdirecto",
  name: "CETESdirecto",
  country: "México",
  category: "Valores gubernamentales",
  website: "https://www.cetesdirecto.com/sites/portal/inicio",
  notes:
    "Plataforma de Nacional Financiera para invertir directamente en valores gubernamentales, sin intermediarios y sin comisiones.",
  products: [
    {
      id: "cetesdirecto-cetes",
      name: "CETES",
      description:
        "Títulos gubernamentales con tasas emitidas por Banco de México.",
      annualRate: 6.15,
      calculationMethod: "simple",
      conditions: [
        "1 mes: 6.15% · 3 meses: 6.45%",
        "6 meses: 6.76% · 1 año: 7.06%",
      ],
      icon: "account",
    },
    {
      id: "cetesdirecto-bonos",
      name: "BONOS",
      description:
        "Valores gubernamentales de tasa fija para distintos horizontes.",
      annualRate: 8.18,
      calculationMethod: "simple",
      conditions: [
        "3 años: 8.18% · 5 años: 8.65% · 10 años: 9.16%",
        "20 años: 9.59% · 30 años: 9.68%",
      ],
      icon: "fixed",
    },
    {
      id: "cetesdirecto-bonddia",
      name: "BONDDIA",
      description: "Fondo de inversión con liquidez diaria.",
      annualRate: 6.77,
      calculationMethod: "compound",
      conditions: [
        "1 día: 6.77%",
        "Disponibilidad de recursos en días hábiles",
      ],
      icon: "flexible",
    },
    {
      id: "cetesdirecto-udibonos",
      name: "UDIBONOS",
      description: "Bonos indexados a la inflación.",
      annualRate: 3.93,
      calculationMethod: "simple",
      conditions: [
        "3 años: 3.93% + inflación · 10 años: 4.64% + inflación",
        "30 años: 4.50% + inflación",
      ],
      icon: "fixed",
    },
  ],
};
const initialInstitutions = [
  bancoPlata,
  openbank,
  nu,
  didiCuenta,
  mifel,
  kubo,
  mercadoPago,
  cetesDirecto,
];

function ProductIcon({ type }: { type: RateProduct["icon"] }) {
  return type === "flexible" ? (
    <Sparkles size={24} />
  ) : type === "fixed" ? (
    <CalendarDays size={24} />
  ) : (
    <CircleDollarSign size={24} />
  );
}

function App() {
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem("finanzia-auth-token"),
  );
  const [institutions, setInstitutions] = useState<Institution[]>(() => {
    const saved = localStorage.getItem("finanzia-institutions");
    if (!saved) return initialInstitutions;
    const parsed: Institution[] = JSON.parse(saved);
    const migrated = parsed.map((item) => {
      const catalog = initialInstitutions.find((institution) => institution.id === item.id);
      if (!catalog) return item;
      return {
        ...item,
        products: item.products.map((savedProduct) => {
          const catalogProduct = catalog.products.find(
            (product) => product.id === savedProduct.id,
          );
          const mergedProduct = catalogProduct
            ? { ...catalogProduct, ...savedProduct }
            : savedProduct;
          return {
            ...mergedProduct,
            promoCap: canonicalizeProductPromoCap(item.id, Number(mergedProduct.promoCap)),
          };
        }),
      };
    });
    const additions = [openbank, nu, kubo, mercadoPago, cetesDirecto].filter(
      (item) => !migrated.some((savedItem) => savedItem.id === item.id),
    );
    return [...migrated, ...additions];
  });
  const [selectedId, setSelectedId] = useState("banco-plata");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [databaseLoaded, setDatabaseLoaded] = useState(false);
  useEffect(() => {
    if (window.location.pathname === "/") window.history.replaceState({}, "", "/login");
  }, []);
  useEffect(() => {
    localStorage.setItem("finanzia-institutions", JSON.stringify(institutions));
  }, [institutions]);
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const response = await fetch("/api/institutions");
        if (!response.ok) throw new Error("API unavailable");
        const databaseInstitutions: Institution[] = await response.json();
        setInstitutions((localInstitutions) => {
          // Build a map from DB data, merging with catalog defaults and preserving custom products
          const merged = new Map(databaseInstitutions.map((item) => {
            const catalog = initialInstitutions.find((entry) => entry.id === item.id);
            // Also look at what is currently in local state to preserve custom products
            const localInstitution = localInstitutions.find((entry) => entry.id === item.id);
            if (!catalog) {
              // Custom institution: prefer DB data but merge with local if local is newer/richer
              return [item.id, item] as const;
            }
            // Known catalog institution: merge DB → local custom products → catalog defaults
            const dbProductIds = new Set((item.products ?? []).map((p) => p.id));
            const localCustomProducts = (localInstitution?.products ?? []).filter(
              (p) => !dbProductIds.has(p.id) && !catalog.products.some((cp) => cp.id === p.id),
            );
            const products = [
              ...(item.products ?? []).map((savedProduct) => {
                const catalogProduct = catalog.products.find((entry) => entry.id === savedProduct.id);
                const mergedProduct = catalogProduct ? { ...catalogProduct, ...savedProduct } : savedProduct;
                return {
                  ...mergedProduct,
                  promoCap: canonicalizeProductPromoCap(item.id, Number(mergedProduct.promoCap)),
                };
              }),
              ...localCustomProducts,
            ];
            return [item.id, { ...catalog, ...item, products }] as const;
          }));
          // Preserve custom institutions that exist locally but weren't synced to the DB yet
          const dbIds = new Set(databaseInstitutions.map((item) => item.id));
          const localCustomInstitutions = localInstitutions.filter(
            (item) => !dbIds.has(item.id) && !initialInstitutions.some((ci) => ci.id === item.id),
          );
          return [...merged.values(), ...localCustomInstitutions];
        });
      } catch {
        // localStorage remains available while PostgreSQL is not configured.
      } finally {
        setDatabaseLoaded(true);
      }
    };
    loadInstitutions();
  }, []);
  useEffect(() => {
    if (!databaseLoaded) return;
    fetch("/api/institutions/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(institutions) }).catch(() => undefined);
  }, [databaseLoaded, institutions]);
  useEffect(() => {
    if (!authToken) return;
    let isActive = true;
    fetch("/api/user-config", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((userConfigs) => {
        if (!isActive) return;
        setInstitutions((current) => mergeUserProductConfig(current, userConfigs));
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [authToken]);
  useEffect(() => {
    if (authToken && window.location.pathname === "/login") window.location.replace("/instituciones");
  }, [authToken]);
  const selected =
    institutions.find((item) => item.id === selectedId) ?? institutions[0];
  const filtered = institutions
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort((first, second) => first.name.localeCompare(second.name, "es"));
  if (!authToken)
    return <AuthPage onAuthenticated={setAuthToken} />;
  if (window.location.pathname === "/proteccion")
    return <ProfilePage />;
  if (window.location.pathname === "/perfil") {
    window.location.replace("/proteccion");
    return null;
  }
  if (window.location.pathname === "/inversiones")
    return <InvestmentPage institutions={institutions} />;
  if (window.location.pathname === "/dashboard")
    return <DashboardPage institutions={institutions} />;
  if (window.location.pathname === "/reportes")
    return <ReportsPage institutions={institutions} />;
  if (window.location.pathname === "/configuracion")
    return <ConfigurationPage institutions={institutions} />;
  function saveInstitution(institution: Institution) {
    const validationErrors = validateInstitutionInput({
      name: institution.name,
      website: institution.website,
    });

    if (validationErrors.length > 0) {
      window.alert(validationErrors[0]);
      return;
    }

    setInstitutions((current) => {
      const next = current.some((item) => item.id === institution.id)
        ? current.map((item) => item.id === institution.id ? institution : item)
        : [...current, institution];
      // Persist immediately to localStorage and sync to DB without waiting for the effect
      localStorage.setItem("finanzia-institutions", JSON.stringify(next));
      fetch("/api/institutions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => undefined);
      return next;
    });
    setSelectedId(institution.id);
    setIsFormOpen(false);
    setEditing(null);
  }
  function deleteInstitution(id: string) {
    const item = institutions.find((institution) => institution.id === id);
    if (!item || !window.confirm(`¿Eliminar ${item.name}?`)) return;

    const remaining = institutions.filter(
      (institution) => institution.id !== id,
    );

    const validInstitutionIds = institutionIdsFrom(remaining);
    const localInvestments = JSON.parse(localStorage.getItem("finanzia-investments:" + (localStorage.getItem("finanzia-auth-token") ?? "")) ?? "[]");
    localStorage.setItem(
      "finanzia-investments:" + (localStorage.getItem("finanzia-auth-token") ?? ""),
      JSON.stringify(pruneInstitutionRecords(localInvestments, id)),
    );
    const localUserConfigs = JSON.parse(localStorage.getItem("finanzia-user-configs") ?? "[]");
    localStorage.setItem("finanzia-user-configs", JSON.stringify(localUserConfigs.filter((config: { institutionId?: string }) => validInstitutionIds.has(config.institutionId ?? ""))));

    setInstitutions(remaining);
    setSelectedId(remaining[0]?.id ?? "");
    window.dispatchEvent(new Event("finanzia-institution-deleted"));

    fetch(`/api/institutions/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("finanzia-auth-token") ?? ""}` },
    }).catch(() => undefined);

    fetch("/api/institutions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(remaining),
    }).catch(() => undefined);
  }
  return (
    <div className="app-shell">
      <NavigationHeader pageLabel="Instituciones" />
      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Directorio</span>
              <h1>Instituciones</h1>
            </div>
            <span className="count-badge">{institutions.length}</span>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar institución"
              aria-label="Buscar institución"
            />
          </div>
          <label className="mobile-institution-select">
            Seleccionar institución
            <select
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {filtered.map((institution) => (
                <option value={institution.id} key={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </label>
          <div className="institution-list">
            {filtered.map((institution) => (
              <button
                className={`institution-row ${selected?.id === institution.id ? "active" : ""}`}
                key={institution.id}
                onClick={() => setSelectedId(institution.id)}
              >
                <span className="institution-logo">
                  <Landmark size={20} />
                </span>
                <span className="institution-copy">
                  <strong>{institution.name}</strong>
                  <small>{institution.category}</small>
                </span>
                <ChevronRight size={16} className="row-chevron" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="empty-list">Sin coincidencias.</p>
            )}
          </div>
          <button
            className="new-institution"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus size={17} /> Nueva institución
          </button>
          <div className="sidebar-footer">
            <span>FINANZIA / 01</span>
            <span>v0.1</span>
          </div>
        </aside>
        {selected ? (
          <section className="detail-panel">
            <div className="detail-header">
              <div className="breadcrumb">
                <span>Directorio</span>
                <ChevronRight size={14} />
                <b>{selected.name}</b>
              </div>
              <div className="header-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    setEditing(selected);
                    setIsFormOpen(true);
                  }}
                >
                  <Pencil size={15} /> Editar
                </button>
                <button
                  className="danger-button"
                  onClick={() => deleteInstitution(selected.id)}
                >
                  <Trash2 size={15} /> Eliminar
                </button>
              </div>
            </div>
            <div className="institution-hero">
              <div className="hero-title">
                <div className="plata-logo">
                  P<span>+</span>
                </div>
                <div>
                  <span className="eyebrow orange">Institución financiera</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.notes}</p>
                </div>
              </div>
              <div className="hero-facts">
                <div>
                  <span>País</span>
                  <strong>{selected.country}</strong>
                </div>
                <div>
                  <span>Productos</span>
                  <strong>{selected.products.length}</strong>
                </div>
                <a href={selected.website} target="_blank" rel="noreferrer">
                  Sitio web <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
            <div className="rates-heading">
              <div>
                <span className="eyebrow">Productos registrados</span>
                <h3>Tasas de ahorro</h3>
              </div>
              <span className="last-update">
                Última actualización <b>hoy</b>
              </span>
            </div>
            <div className="product-list">
              {selected.products.map((product, index) => (
                <article
                  className="product-card"
                  key={product.id}
                  style={
                    { "--delay": `${index * 80}ms` } as React.CSSProperties
                  }
                >
                  <div className="product-icon">
                    <ProductIcon type={product.icon} />
                  </div>
                  <div className="product-info">
                    <h4>
                      {product.name}{" "}
                      {product.badge && (
                        <span className="ultra-badge">{product.badge}</span>
                      )}
                    </h4>
                    <p className="primary-rate">{product.description}</p>
                    {product.conditions.map((condition) => (
                      <p className="condition" key={condition}>
                        <Check size={14} />
                        {condition}
                      </p>
                    ))}
                  </div>
                  <span className="product-index">0{index + 1}</span>
                </article>
              ))}
            </div>
            {(selected.id === "mifel" || selected.id === "mercado-pago") && (
              <div className="calculation-note">
                <strong>{selected.id === "mifel" ? "Mifel:" : "Mercado Pago:"}</strong>
                <span>
                  {selected.id === "mifel"
                    ? "Los rendimientos y el ISR se calculan diariamente; si el día cae en fin de semana, el registro se refleja en el siguiente día hábil."
                    : "La tasa preferencial del 12% aplica hasta $25,000 y requiere un depósito mensual de $3,000 para conservarse."}
                </span>
              </div>
            )}
            <div className="source-note">
              <Banknote size={16} />
              <span>
                Información capturada de material proporcionado por el usuario.
              </span>
              <span className="source-line" />
            </div>
          </section>
        ) : (
          <div className="no-selection">
            <Landmark size={30} />
            <p>Agrega una institución para comenzar.</p>
          </div>
        )}
      </main>
      {isFormOpen && (
        <InstitutionForm
          institution={editing}
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSave={saveInstitution}
        />
      )}
    </div>
  );
}

function InstitutionForm({
  institution,
  onClose,
  onSave,
}: {
  institution: Institution | null;
  onClose: () => void;
  onSave: (institution: Institution) => void;
}) {
  const [name, setName] = useState(institution?.name ?? "");
  const [country, setCountry] = useState(institution?.country ?? "México");
  const [category, setCategory] = useState(
    institution?.category ?? "Banca digital",
  );
  const [website, setWebsite] = useState(institution?.website ?? "");
  const [notes, setNotes] = useState(institution?.notes ?? "");
  const [products, setProducts] = useState<RateProduct[]>(
    institution?.products ?? [],
  );
  function addProduct() {
    setProducts([
      ...products,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        conditions: [],
        icon: "account",
        calculationMethod: "compound",
        annualRate: 0,
        promoCap: 0,
        daysBase: 365,
      },
    ]);
  }
  function updateProduct(
    id: string,
    field: keyof RateProduct,
    value: string | number | string[] | boolean | undefined,
  ) {
    setProducts(
      products.map((product) =>
        product.id === id ? { ...product, [field]: value } : product,
      ),
    );
  }
  function removeProduct(id: string) {
    setProducts(products.filter((product) => product.id !== id));
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextInstitution: Institution = {
      id: institution?.id ?? crypto.randomUUID(),
      name: name.trim(),
      country,
      category,
      website,
      notes: notes || "Sin notas adicionales.",
      products: products
        .filter((product) => product.name.trim())
        .map((product) => ({
          ...product,
          name: product.name.trim(),
          annualRate: Number(product.annualRate) || 0,
          promoCap: Number(product.promoCap) || 0,
          daysBase: Number(product.daysBase) || 365,
          icon: product.icon || "account",
          calculationMethod: product.calculationMethod || (product.icon === "fixed" ? "simple" : "compound"),
          conditions: product.conditions?.length ? product.conditions : (product.description ? [product.description] : []),
        })),
    };

    const validationErrors = validateInstitutionInput({
      name: nextInstitution.name,
      website: nextInstitution.website,
    });

    if (validationErrors.length > 0) {
      window.alert(validationErrors[0]);
      return;
    }

    onSave(nextInstitution);
  }
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow orange">Registro</span>
            <h2 id="form-title">
              {institution ? "Editar institución" : "Nueva institución"}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar formulario"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Nombre de la institución
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Banco Plata"
              />
            </label>
            <label>
              País
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              />
            </label>
            <label>
              Categoría
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </label>
            <label>
              Sitio web
              <input
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://"
              />
            </label>
          </div>
          <label>
            Notas
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Contexto o fuente de la información"
            />
          </label>
          <div className="form-products">
            <div className="form-products-heading">
              <span className="eyebrow">Productos y tasas</span>
              <button
                type="button"
                className="text-button"
                onClick={addProduct}
              >
                <Plus size={15} /> Añadir producto
              </button>
            </div>
            {products.map((product, index) => (
              <div className="product-input-card" key={product.id}>
                <div className="product-input-header">
                  <span className="product-badge">{index + 1}</span>
                  <input
                    className="product-name-inline"
                    required
                    value={product.name}
                    onChange={(event) =>
                      updateProduct(product.id, "name", event.target.value)
                    }
                    placeholder="Nombre del producto"
                  />
                  <button
                    type="button"
                    className="danger-icon-button"
                    onClick={() => removeProduct(product.id)}
                    aria-label="Eliminar producto"
                    title="Eliminar producto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="product-fields-row">
                  <label className="product-field">
                    <span className="product-field-label">Modalidad</span>
                    <select
                      value={product.icon === "fixed" ? "plazo" : product.icon === "flexible" ? "flexible" : "vista"}
                      onChange={(event) => {
                        const val = event.target.value;
                        if (val === "plazo") {
                          updateProduct(product.id, "icon", "fixed");
                          updateProduct(product.id, "calculationMethod", "simple");
                        } else if (val === "flexible") {
                          updateProduct(product.id, "icon", "flexible");
                          updateProduct(product.id, "calculationMethod", "flexible");
                        } else {
                          updateProduct(product.id, "icon", "account");
                          updateProduct(product.id, "calculationMethod", "compound");
                        }
                      }}
                    >
                      <option value="vista">Compuesto diario</option>
                      <option value="plazo">Interés simple</option>
                      <option value="flexible">Flexible con tope</option>
                    </select>
                  </label>
                  <label className="product-field">
                    <span className="product-field-label">Tasa anual</span>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.annualRate ?? 0}
                        onChange={(event) =>
                          updateProduct(product.id, "annualRate", Number(event.target.value))
                        }
                        placeholder="0"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </label>
                  <label className="product-field">
                    <span className="product-field-label">Tope promo</span>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.promoCap ?? 0}
                        onChange={(event) =>
                          updateProduct(product.id, "promoCap", Number(event.target.value))
                        }
                        placeholder="0"
                      />
                      <span className="input-suffix">$</span>
                    </div>
                  </label>
                  <label className="product-field">
                    <span className="product-field-label">Base días</span>
                    <select
                      value={product.daysBase ?? 365}
                      onChange={(event) =>
                        updateProduct(product.id, "daysBase", Number(event.target.value))
                      }
                    >
                      <option value={365}>365</option>
                      <option value={360}>360</option>
                    </select>
                  </label>
                </div>
                <input
                  className="product-description-input"
                  value={product.description}
                  onChange={(event) =>
                    updateProduct(product.id, "description", event.target.value)
                  }
                  placeholder="Condiciones: ej. Rendimiento diario garantizado, liquidez en días hábiles..."
                />
              </div>
            ))}
            {products.length === 0 && (
              <p className="empty-products">
                Añade los productos que quieras consultar.
              </p>
            )}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              <Check size={16} /> Guardar institución
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
