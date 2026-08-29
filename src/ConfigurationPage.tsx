import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { defaultFormulaConfig, formulaKey } from "./calculationConfig";
import type { FormulaId, FormulaStore } from "./calculationConfig";
import NavigationHeader from "./NavigationHeader";
import { authHeaders } from "./auth";

type RateProduct = {
  id: string;
  name: string;
  description: string;
  conditions: string[];
  icon: "account" | "flexible" | "fixed";
  website?: string;
  promoCap?: number;
  annualRate?: number;
  excessRate?: number;
  calculationMethod?: "compound" | "simple" | "simple360" | "flexible" | "openbank" | "mifel360" | "kubo";
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

type Props = { institutions: Institution[] };

export default function ConfigurationPage({ institutions }: Props) {
  const [savedMessage, setSavedMessage] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [savedFormulaStore, setSavedFormulaStore] = useState<FormulaStore>({});
  const [formulaStore, setFormulaStore] = useState<FormulaStore>({});
  const [selectedFormulaKey, setSelectedFormulaKey] = useState("");
  const vistaFormulaFields: { id: FormulaId; label: string; variables: string }[] = [
    { id: "promotionalBalance", label: "Saldo promocional", variables: "availableBalance, promoCap" },
    { id: "excessBalance", label: "Saldo excedente", variables: "availableBalance, promoCap" },
    { id: "compoundInterest", label: "Interés compuesto (vista)", variables: "principal, annualRate, days" },
    { id: "updatedBalance", label: "Saldo actualizado", variables: "availableBalance, totalAccumulated" },
  ];
  const plazoFormulaFields: { id: FormulaId; label: string; variables: string }[] = [
    { id: "simpleInterest", label: "Interés simple", variables: "principal, annualRate, days" },
    { id: "updatedBalance", label: "Saldo actualizado al vencimiento", variables: "availableBalance, totalAccumulated" },
  ];
  const formulaFields: { id: FormulaId; label: string; variables: string }[] = [
    { id: "etfCurrentPrice", label: "Precio Actual", variables: "currentValue, titles" },
    { id: "etfCapitalInvested", label: "Capital Invertido", variables: "titles, purchasePrice" },
    { id: "etfGain", label: "Ganancia", variables: "currentValue, capitalInvested" },
    { id: "etfReturnRate", label: "Rendimiento", variables: "gain, capitalInvested" },
    { id: "etfAnnualDividendIncome", label: "Ingreso Div. Anual", variables: "currentValue, dividendRate" },
    { id: "etfMonthlyDividendIncome", label: "Ingreso Div. Mensual", variables: "annualDividendIncome" },
  ];
  const formulaExamples: Record<FormulaId, string> = {
    promotionalBalance: "Ejemplo: min(30000, 25000) = 25000",
    excessBalance: "Ejemplo: max(0, 30000 - 25000) = 5000",
    simpleInterest: "Ejemplo: 10000 * 8 / 100 * 30 / 365 = 65.75",
    compoundInterest: "Ejemplo: 10000 * ((1 + 8 / 100 / 365) ^ 30 - 1) = 65.94",
    updatedBalance: "Ejemplo: 10000 + 65.75 = 10065.75",
    etfCurrentPrice: "Ejemplo: 238213.80 / 20 = 11910.69",
    etfCapitalInvested: "Ejemplo: 20 * 11893.65 = 237873",
    etfGain: "Ejemplo: 238213.80 - 237873 = 340.80",
    etfReturnRate: "Ejemplo: 340.80 / 237873 * 100 = 0.14",
    etfAnnualDividendIncome: "Ejemplo: 238213.80 * 1.20 / 100 = 2858.57",
    etfMonthlyDividendIncome: "Ejemplo: 2858.57 / 12 = 238.21",
  };
  const formulaProducts = useMemo(() => [
    ...institutions.flatMap((institution) => institution.products.map((product) => ({ institution, product }))),
    ...Object.keys(formulaStore)
      .filter((key) => key.startsWith("etf:"))
      .map((key) => ({
        institution: {
          id: "etf",
          name: "ETF",
          country: "",
          category: "ETF",
          website: "",
          notes: "",
          products: [{ id: key.slice(4), name: key.slice(4), description: "", conditions: [], icon: "account" as const, calculationMethod: "etf" as const }],
        },
        product: { id: key.slice(4), name: key.slice(4), description: "", conditions: [], icon: "account" as const, calculationMethod: "etf" as const },
      })),
  ], [institutions, formulaStore]);
  useEffect(() => {
    const loadFormulas = async () => {
      try {
        const response = await fetch("/api/formulas", { headers: authHeaders() });
        if (response.status === 401) {
          setSavedMessage("Debes iniciar sesión para ver las fórmulas.");
          return;
        }
        if (response.status === 503) {
          setSavedMessage("PostgreSQL no está configurado. Usando valores por defecto.");
          setFormulaStore({});
          setSavedFormulaStore({});
          return;
        }
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
          throw new Error(error.error || 'Error al cargar las fórmulas');
        }

        const saved: FormulaStore = await response.json();
        const investResponse = await fetch("/api/investments", { headers: authHeaders() });
        const investments: { type?: string; etfName?: string; productId?: string }[] = investResponse.ok ? await investResponse.json() : [];

        const seeded = { ...saved };
        investments.filter((investment) => investment.type === "etf").forEach((investment) => {
          const key = formulaKey("etf", investment.etfName ?? investment.productId ?? "ETF");
          if (!seeded[key]) seeded[key] = { ...defaultFormulaConfig };
        });

        formulaProducts.forEach(({ institution, product }) => {
          const key = formulaKey(institution.id, product.id);
          if (!seeded[key]) seeded[key] = { ...defaultFormulaConfig };
        });

        setFormulaStore(seeded);
        setSavedFormulaStore(seeded);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No fue posible cargar las fórmulas desde PostgreSQL.";
        setSavedMessage(message);
        // Fallback: use empty formulas, will be populated with defaults
        setFormulaStore({});
        setSavedFormulaStore({});
      }
    };

    loadFormulas();
  }, [formulaProducts]);
  const selectedFormula = formulaProducts.find(({ institution, product }) => formulaKey(institution.id, product.id) === selectedFormulaKey) ?? formulaProducts[0];
  const activeFormulaKey = selectedFormula ? formulaKey(selectedFormula.institution.id, selectedFormula.product.id) : "";
  const formulas = selectedFormula ? { ...defaultFormulaConfig, ...formulaStore[activeFormulaKey] } : defaultFormulaConfig;
  const isTermProduct = selectedFormula?.product.calculationMethod === "simple" || selectedFormula?.product.calculationMethod === "simple360";
  const isEtfProduct = selectedFormula?.institution.id === "etf";
  const updateFormula = (id: FormulaId, value: string) => {
    if (!activeFormulaKey) return;
    setFormulaStore((current) => ({ ...current, [activeFormulaKey]: { ...formulas, [id]: value } }));
    setSavedMessage("");
  };

  const requestSaveConfirmation = () => setIsConfirmOpen(true);

  const saveChanges = async () => {
    try {
      const response = await fetch("/api/formulas", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(formulaStore),
      });
      if (response.status === 503) {
        setSavedMessage("PostgreSQL no está configurado. Los cambios no se guardaron.");
        setIsConfirmOpen(false);
        return;
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'Error al guardar');
      }
      setSavedFormulaStore(formulaStore);
      setIsConfirmOpen(false);
      setSavedMessage("Configuración guardada en PostgreSQL y aplicada al dashboard.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible guardar las fórmulas en PostgreSQL.";
      setSavedMessage(message);
    }
  };
  const cancelChanges = () => {
    setFormulaStore(savedFormulaStore);
    setIsConfirmOpen(false);
    setSavedMessage("Cambios cancelados.");
  };

  return (
    <div className="investment-page configuration-page">
      <NavigationHeader pageLabel="Configuración" />
      <main className="investment-content">
        <div className="investment-intro">
          <div>
            <span className="eyebrow orange">Parámetros del motor</span>
            <h1>Configuración</h1>
            <p>Edita las variables que usa Finanzia para calcular cada inversión.</p>
          </div>
        </div>
        <section className="formula-panel">
          <div className="form-panel-heading">
            <div>
              <span className="eyebrow">Reglas activas</span>
              <h2>Fórmulas de cálculo</h2>
            </div>
            <Calculator size={24} />
          </div>
          <div className="formula-list">
            <p><strong>Saldo promocional:</strong> mínimo entre el saldo disponible y el tope promo.</p>
            <p><strong>Saldo excedente:</strong> saldo disponible menos el saldo promocional.</p>
            <p><strong>Rendimiento:</strong> cada saldo se calcula con su tasa anual y el método definido por la institución.</p>
            <p><strong>Saldo actualizado:</strong> saldo disponible más el rendimiento acumulado menos retiros.</p>
            <p><strong>Variables disponibles para ETF:</strong> <code>titles</code>, <code>purchasePrice</code>, <code>currentValue</code>, <code>dividendRate</code> y resultados anteriores.</p>
          </div>
        </section>
        <label className="formula-product-selector">
          Fórmulas de institución y producto
          <select value={activeFormulaKey} onChange={(event) => setSelectedFormulaKey(event.target.value)}>
            {formulaProducts.map(({ institution, product }) => (
              <option value={formulaKey(institution.id, product.id)} key={formulaKey(institution.id, product.id)}>
                {institution.name} / {product.name}
              </option>
            ))}
          </select>
        </label>
        {!isTermProduct && !isEtfProduct && <section className="formula-panel">
          <div className="form-panel-heading"><div><span className="eyebrow">Editor editable</span><h2>Inversión a la vista</h2></div><Calculator size={24} /></div>
          <div className="formula-editor-list">
            {vistaFormulaFields.map((field) => (
              <label key={field.id}>
                {field.label}<small>Variables: {field.variables}</small><small className="formula-example">{formulaExamples[field.id]}</small>
                <input value={formulas[field.id]} onBlur={requestSaveConfirmation} onChange={(event) => updateFormula(field.id, event.target.value)} />
              </label>
            ))}
          </div>
        </section>}
        {isTermProduct && <section className="formula-panel">
          <div className="form-panel-heading"><div><span className="eyebrow">Editor editable</span><h2>Inversión a plazo</h2></div><Calculator size={24} /></div>
          <div className="formula-editor-list">
            {plazoFormulaFields.map((field) => (
              <label key={field.id}>
                {field.label}<small>Variables: {field.variables}</small><small className="formula-example">{formulaExamples[field.id]}</small>
                <input value={formulas[field.id]} onBlur={requestSaveConfirmation} onChange={(event) => updateFormula(field.id, event.target.value)} />
              </label>
            ))}
          </div>
        </section>}
        {isEtfProduct && <section className="formula-panel">
          <div className="form-panel-heading"><div><span className="eyebrow">Editor editable</span><h2>Fórmulas ETF</h2></div><Calculator size={24} /></div>
          <div className="formula-editor-list">
            {formulaFields.map((field) => (
              <label key={field.id}>
                {field.label}<small>Variables: {field.variables}</small><small className="formula-example">{formulaExamples[field.id]}</small>
                <input value={formulas[field.id]} onBlur={requestSaveConfirmation} onChange={(event) => updateFormula(field.id, event.target.value)} />
              </label>
            ))}
          </div>
        </section>}
        {savedMessage && <p className="save-message">{savedMessage}</p>}
        {isConfirmOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="configuration-dialog-title"><div className="configuration-dialog"><h2 id="configuration-dialog-title">¿Deseas guardar los cambios?</h2><p>Los nuevos valores modificarán los cálculos del dashboard.</p><div className="modal-actions"><button className="secondary-button" onClick={cancelChanges}>Cancelar</button><button className="primary-button" onClick={() => void saveChanges()}>Guardar cambios</button></div></div></div>}
      </main>
    </div>
  );
}
