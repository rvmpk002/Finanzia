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
import ConfigurationPage from "./ConfigurationPage";
import AuthPage from "./AuthPage";
import ProfilePage from "./ProfilePage";
import ReportsPage from "./ReportsPage";
import NavigationHeader from "./NavigationHeader";
import { mergeUserProductConfig } from "./userConfig";
import { validateInstitutionInput } from "./validation";
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
  notes: "Tasas vigentes para productos Plata Cuenta y Ahorro.",
  products: [
    {
      id: "plata-cuenta",
      name: "Plata Cuenta",
      description: "7% sobre los primeros $20,000 con Plata+¹",
      annualRate: 7,
      promoCap: 20000,
      calculationMethod: "compound",
      conditions: [],
      icon: "account",
    },
    {
      id: "ahorro-flexible",
      name: "Ahorro Flexible",
      badge: "Ultra",
      description: "15% en tus primeros $25,000 por 60 días²",
      annualRate: 15,
      promoCap: 25000,
      calculationMethod: "flexible",
      promotionDays: 60,
      conditions: [
        "9% sin monto máximo con Plata+³",
        "7% sin monto máximo sin Plata+⁴",
      ],
      icon: "flexible",
    },
    {
      id: "ahorro-fijo",
      name: "Ahorro Fijo",
      description: "Con Plata+: 9%-11% · 30-360 días⁵",
      annualRate: 9,
      calculationMethod: "simple360",
      daysBase: 360,
      conditions: ["Sin Plata+: 7%-8% · 30-360 días⁶"],
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
      id: "openbank-13",
      name: "Rendimiento 13%",
      description: "13% de rendimiento anual fijo, antes de impuestos.",
      annualRate: 13,
      promoCap: 30000,
      calculationMethod: "openbank",
      daysBase: 360,
      conditions: [
        "GAT Nominal 13.88% · GAT Real 9.55%",
        "Inversión de $0.01 a $30,000 · plazo de 1 día",
      ],
      icon: "account",
    },
    {
      id: "openbank-7",
      name: "Rendimiento 7%",
      description: "7% de rendimiento anual fijo, antes de impuestos.",
      annualRate: 7,
      promoCap: 1000000,
      calculationMethod: "openbank",
      daysBase: 360,
      conditions: [
        "GAT Nominal 7.25% · GAT Real 3.17%",
        "Inversión de $30,000.01 a $1,000,000 · plazo de 1 día",
      ],
      icon: "flexible",
    },
    {
      id: "openbank-6-5",
      name: "Rendimiento 6.5%",
      description: "6.5% de rendimiento anual fijo, antes de impuestos.",
      annualRate: 6.5,
      promoCap: 1000000,
      calculationMethod: "openbank",
      daysBase: 360,
      conditions: [
        "GAT Nominal 6.72% · GAT Real 2.66%",
        "Inversión desde $1,000,000.01 · plazo de 1 día",
      ],
      icon: "fixed",
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
    "Cuenta Nu y Cajitas Nu para hacer crecer tu dinero con disponibilidad 24/7.",
  products: [
    {
      id: "nu-cuenta",
      name: "Cuenta Nu",
      description: "Hasta 13% de rendimiento anual.",
      annualRate: 13,
      promoCap: 25000,
      excessRate: 0,
      calculationMethod: "compound",
      conditions: [
        "13% de rendimiento promocional sobre los primeros $25,000 MXN",
        "Cuenta de débito para transferencias, retiros y pagos de servicios",
        "Sin anualidad y con atención a clientes 24/7",
      ],
      icon: "account",
    },
    {
      id: "nu-cajita",
      name: "Cajita Nu",
      description: "6.50% de rendimiento anual para emergencias.",
      annualRate: 6.5,
      calculationMethod: "compound",
      conditions: ["Dinero disponible siempre · crecimiento diario"],
      icon: "flexible",
    },
    {
      id: "nu-cajita-congelada",
      name: "Cajita Nu congelada",
      description: "Hasta 6.80% de rendimiento.",
      annualRate: 6.8,
      calculationMethod: "compound",
      conditions: [
        "Congela el saldo por unos días para alcanzar un mejor rendimiento",
      ],
      icon: "fixed",
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
      id: "didi-15",
      name: "Tasa preferente",
      description:
        "15% de rendimiento anual fijo para los primeros $10,000 MXN.",
      conditions: [
        "GAT Nominal 16.18% · GAT Real 11.77%",
        "Rendimientos diarios · fecha de cálculo: 13 de julio de 2026",
      ],
      icon: "account",
      promoCap: 10000,
      annualRate: 15,
      excessRate: 7,
      calculationMethod: "compound",
    },
    {
      id: "didi-7",
      name: "Saldo restante",
      description: "7% de rendimiento anual fijo para el monto restante.",
      conditions: [
        "GAT Nominal 7.25% · GAT Real 3.17%",
        "Aplica sobre el saldo que exceda los primeros $10,000 MXN",
      ],
      icon: "flexible",
      promoCap: 10000,
      annualRate: 7,
      excessRate: 7,
      calculationMethod: "compound",
    },
    {
      id: "didi-beneficios",
      name: "Beneficios de DiDi Cuenta",
      description: "Tu dinero disponible 24/7 para enviar, recibir y pagar.",
      conditions: [
        "Sin comisión por manejo, saldo mínimo, apertura o plazos forzosos",
        "Límite regulatorio: hasta 3,000 UDIS al mes, aproximadamente $25,000 MXN",
      ],
      icon: "fixed",
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
    "Dos opciones de cuenta digital Mifel para administrar tu dinero desde canales digitales.",
  products: [
    {
      id: "mifel-cuenta-digital",
      name: "Cuenta Digital Mifel",
      description:
        "10% de rendimiento anual con rendimientos diarios. A partir de $100.",
      annualRate: 10,
      calculationMethod: "mifel360",
      taxRate: 9,
      daysBase: 360,
      promoCap: 25000,
      conditions: [
        "Tope de depósitos: 3,000 UDIS al mes, aproximadamente $25,000 MXN",
        "Dinero protegido por el IPAB · opción Objetivos para separar tu dinero",
      ],
      website:
        "https://www.mifel.com.mx/personas/cuentas/cuenta-digital?meta.slug=cuenta-digital-mifel",
      icon: "account",
    },
    {
      id: "mifel-cuenta-digital-evoluciona",
      name: "Cuenta Digital Evoluciona",
      description:
        "10% de rendimiento anual con rendimientos diarios. A partir de $100.",
      annualRate: 10,
      calculationMethod: "mifel360",
      taxRate: 9,
      daysBase: 360,
      promoCap: 500000,
      conditions: [
        "Tope de saldo: $500,000 MXN",
        "Depósitos mensuales de hasta $500,000 MXN · completa tu expediente desde la app",
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
  notes: "Inversiones Kubo con opciones de liquidez y plazos de hasta 4 años.",
  products: [
    {
      id: "kubo-liquidez",
      name: "Liquidez",
      description: "13.00% de rendimiento anual a 1 día.",
      annualRate: 13,
      calculationMethod: "kubo",
      conditions: [
        "Disponible como opción de liquidez",
        "Tasa mostrada en la captura proporcionada",
      ],
      icon: "account",
    },
    {
      id: "kubo-plazos",
      name: "Plazos",
      description: "Elige el plazo que mejor se adapte a tu inversión.",
      annualRate: 7.5,
      calculationMethod: "kubo",
      conditions: [
        "30 días: 7.50% · 60 días: 7.55%",
        "3 meses: 7.60% · 6 meses: 7.76%",
      ],
      icon: "flexible",
    },
    {
      id: "kubo-largo-plazo",
      name: "Largo plazo",
      description: "12.00% anual a 1 año.",
      annualRate: 12,
      calculationMethod: "kubo",
      conditions: [
        "2 años: 9.80% · 4 años: 10.12%",
        "También permite elegir un plazo a tu medida",
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
    "Cuenta Mercado Pago con rendimiento anual variable según los ingresos o transferencias recibidas durante el mes.",
  products: [
    {
      id: "mercado-pago-12",
      name: "Rendimiento preferente",
      description: "Hasta 12% de rendimiento anual.",
      annualRate: 12,
      promoCap: 25000,
      excessRate: 6,
      calculationMethod: "compound",
      conditions: [
        "Alcanza un total de $3,000 en ingresos o transferencias recibidas durante el mes",
        "El rendimiento se mantiene hasta el último día del mes siguiente",
        "Puedes usar el dinero como quieras sin perder el beneficio",
      ],
      icon: "account",
    },
    {
      id: "mercado-pago-6",
      name: "Rendimiento base",
      description: "Hasta 6% de rendimiento anual.",
      annualRate: 6,
      promoCap: 25000,
      excessRate: 6,
      calculationMethod: "compound",
      conditions: [
        "Aplica cuando no alcanzas $3,000 en ingresos durante el mes",
        "El dinero sigue disponible para usarlo cuando quieras",
      ],
      icon: "flexible",
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
          return catalogProduct ? { ...catalogProduct, ...savedProduct } : savedProduct;
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
        setInstitutions(() => {
          const merged = new Map(databaseInstitutions.map((item) => {
            const catalog = initialInstitutions.find((entry) => entry.id === item.id);
            return [item.id, catalog
              ? { ...catalog, ...item, products: catalog.products.map((product) => ({
                  ...product,
                  ...item.products.find((savedProduct) => savedProduct.id === product.id),
                })) }
              : item] as const;
          }));
          return [...merged.values()];
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
  if (window.location.pathname === "/configuracion")
    return <ConfigurationPage institutions={institutions} />;
  if (window.location.pathname === "/reportes")
    return <ReportsPage institutions={institutions} />;
  function saveInstitution(institution: Institution) {
    const validationErrors = validateInstitutionInput({
      name: institution.name,
      website: institution.website,
    });

    if (validationErrors.length > 0) {
      window.alert(validationErrors[0]);
      return;
    }

    setInstitutions((current) =>
      current.some((item) => item.id === institution.id)
        ? current.map((item) =>
            item.id === institution.id ? institution : item,
          )
        : [...current, institution],
    );
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
    setInstitutions(remaining);
    setSelectedId(remaining[0]?.id ?? "");
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
      },
    ]);
  }
  function updateProduct(
    id: string,
    field: "name" | "description",
    value: string,
  ) {
    setProducts(
      products.map((product) =>
        product.id === id ? { ...product, [field]: value } : product,
      ),
    );
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
        .map((product) => ({ ...product, name: product.name.trim() })),
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
            {products.map((product) => (
              <div className="product-input" key={product.id}>
                <input
                  value={product.name}
                  onChange={(event) =>
                    updateProduct(product.id, "name", event.target.value)
                  }
                  placeholder="Nombre del producto"
                />
                <input
                  value={product.description}
                  onChange={(event) =>
                    updateProduct(product.id, "description", event.target.value)
                  }
                  placeholder="Descripción de la tasa"
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
