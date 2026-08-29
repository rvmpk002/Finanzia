import { useEffect, useState } from "react";
import {
  BarChart3,
  Clock3,
  LineChart,
  WalletCards,
} from "lucide-react";
import { defaultFormulaConfig, evaluateFormula } from "./calculationConfig";
import { formulaKey } from "./calculationConfig";
import type { FormulaConfig, FormulaStore } from "./calculationConfig";
import {
  bancoPlataInterest,
  completedMonthsBetween,
  daysInMonth,
  flexibleUltraInterest,
  getCalculatedUpdatedBalance,
  kuboInterest,
  mifelInterest,
  openbankInterest,
  openbankPostingDays,
  compoundInterest,
  simpleInterest,
} from "./calculationEngine";
import NavigationHeader from "./NavigationHeader";
import { authHeaders, investmentStorageKey } from "./auth";

type Product = {
  id: string;
  name: string;
  promoCap?: number;
  annualRate?: number;
  excessRate?: number;
  calculationMethod?: "compound" | "simple" | "simple360" | "flexible" | "openbank" | "mifel360" | "kubo";
  taxRate?: number;
  daysBase?: number;
  promotionDays?: number;
};
type Institution = { id: string; name: string; products: Product[] };
type Investment = {
  id?: number;
  type: "vista" | "plazo" | "etf";
  institutionId: string;
  productId: string;
  balance: number;
  promoCap: number;
  annualRate: number;
  excessRate?: number;
  monthlyYield: number;
  nextMonthBalance: number;
  updatedBalance: number;
  updatedBalanceOverride?: number;
  endDate?: string;
  nextMonthExcess: number;
  calculatedAt: string;
  daysElapsed: number;
  estimatedToday: number;
  startDate: string;
  promotionalYield: number;
  excessYield: number;
  totalAccumulated: number;
  dailyYield: number;
  termDays?: number;
  taxWithheld?: number;
  netDailyYield?: number;
  withdrawn: number;
  plataPlus?: boolean;
  updatedAt?: string;
  etfName?: string;
  etfTitles?: number;
  etfPurchasePrice?: number;
  etfCurrentValue?: number;
  etfDividendRate?: number;
};

type Tab = Investment["type"];
const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});
const amount = (value: number | undefined) => money.format(Number(value) || 0);
const percentage = (value: number) => `${value.toFixed(2)}%`;
const cents = (value: number) => Math.round(value * 100) / 100;
const etfMetrics = (investment: Investment, formulas: FormulaConfig) => {
  const titles = Number(investment.etfTitles) || 0;
  const purchasePrice = cents(Number(investment.etfPurchasePrice) || 0);
  const currentValue = cents(Number(investment.etfCurrentValue ?? investment.balance) || 0);
  const dividendRate = Number(investment.etfDividendRate) || 0;
  const variables = { titles, purchasePrice, currentValue, dividendRate };
  const calculate = (formula: string, values: Record<string, number>) => {
    try { return evaluateFormula(formula, values); } catch { return 0; }
  };
  const currentPrice = calculate(formulas.etfCurrentPrice, variables);
  const capitalInvested = calculate(formulas.etfCapitalInvested, variables);
  const gain = calculate(formulas.etfGain, { ...variables, capitalInvested });
  const returnRate = calculate(formulas.etfReturnRate, { ...variables, capitalInvested, gain });
  const annualDividendIncome = calculate(formulas.etfAnnualDividendIncome, { ...variables, capitalInvested, gain, returnRate });
  const monthlyDividendIncome = calculate(formulas.etfMonthlyDividendIncome, { ...variables, capitalInvested, gain, returnRate, annualDividendIncome });
  return {
    titles,
    purchasePrice,
    currentPrice,
    capitalInvested,
    currentValue,
    gain,
    returnRate,
    dividendRate,
    annualDividendIncome,
    monthlyDividendIncome,
  };
};
const kuboAvailabilityDate = (date: Date) => {
  const availability = new Date(date);
  availability.setDate(availability.getDate() + 1);
  if (availability.getDay() === 6) availability.setDate(availability.getDate() + 2);
  if (availability.getDay() === 0) availability.setDate(availability.getDate() + 1);
  return availability.toISOString().slice(0, 10);
};
const calculateInvestment = (
  investment: Investment,
  institutions: Institution[],
  formulas: FormulaConfig = defaultFormulaConfig,
): Investment => {
  const calculate = (formula: string, variables: Record<string, number>, fallback: number) => {
    try { return evaluateFormula(formula, variables); } catch { return fallback; }
  };
  const product = institutions
    .find((institution) => institution.id === investment.institutionId)
    ?.products.find((item) => item.id === investment.productId);
  const isFlexibleUltra = product?.calculationMethod === "flexible";
  const calculationMethod = product?.calculationMethod ?? (investment.type === "plazo" ? "simple" : "compound");
  const taxRate = product?.taxRate ?? 0;
  const daysBase = product?.daysBase ?? 365;
  const promotionDays = product?.promotionDays ?? 60;
  const catalogPromoCap = product?.promoCap ?? 0;
  const promoCap = investment.promoCap ?? catalogPromoCap;
  const catalogAnnualRate = product?.annualRate ?? 0;
  const annualRate = investment.annualRate ?? catalogAnnualRate;
  const catalogExcessRate = product?.excessRate ?? annualRate;
  const excessRate = investment.excessRate ?? catalogExcessRate;
  const balance = Math.max(0, Number(investment.balance) || 0);
  const withdrawn = Math.max(0, Number(investment.withdrawn) || 0);
  const manualUpdatedBalance = Number(investment.updatedBalanceOverride);
  const availableBalance = Number.isFinite(manualUpdatedBalance)
    ? Math.max(0, manualUpdatedBalance)
    : Math.max(0, balance - withdrawn);
  const startDate = new Date(`${investment.startDate}T00:00:00`);
  const isKubo = calculationMethod === "kubo";
  const isKuboTerm = isKubo && investment.type === "plazo";
  const calculationDate = new Date(
    `${(isKuboTerm
      ? investment.endDate ?? new Date().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10))}T00:00:00`,
  );
  const daysElapsed = Math.max(
    0,
    Math.floor(
      (calculationDate.getTime() - startDate.getTime()) / 86400000,
    ),
  );
  const monthlyDays = daysInMonth(calculationDate);
  const promoBalance = calculate(formulas.promotionalBalance, { availableBalance, promoCap }, Math.min(availableBalance, promoCap));
  const excessBalance = calculate(formulas.excessBalance, { availableBalance, promoCap }, Math.max(0, availableBalance - promoCap));
  const configuredSimpleInterest = (principal: number, rate: number, days: number, daysBase = 365) =>
    calculate(
      formulas.simpleInterest,
      { principal, annualRate: rate, days, daysBase },
      simpleInterest(principal, rate, days, daysBase),
    );
  const configuredCompoundInterest = (principal: number, rate: number, days: number) =>
    calculate(formulas.compoundInterest, { principal, annualRate: rate, days }, compoundInterest(principal, rate, days));
  const openbankPostingDaysForDate = calculationMethod === "openbank"
    ? openbankPostingDays(calculationDate)
    : 0;
  const dailyYield = calculationMethod === "flexible"
    ? flexibleUltraInterest(availableBalance, promoCap, 1, annualRate, excessRate, promotionDays)
    : calculationMethod === "kubo"
      ? kuboInterest(availableBalance, annualRate, 1)
    : calculationMethod === "simple"
      ? configuredSimpleInterest(availableBalance, annualRate, 1, daysBase)
    : calculationMethod === "simple360"
      ? configuredSimpleInterest(availableBalance, annualRate, 1, 360)
    : calculationMethod === "mifel360"
      ? mifelInterest(availableBalance, annualRate, 1)
    : calculationMethod === "openbank"
      ? openbankInterest(availableBalance, annualRate, excessRate, openbankPostingDaysForDate, daysBase)
    : configuredCompoundInterest(promoBalance, annualRate, 1) +
      configuredCompoundInterest(excessBalance, excessRate, 1);
  const monthlyYield = isFlexibleUltra
    ? flexibleUltraInterest(availableBalance, promoCap, monthlyDays, annualRate, excessRate, promotionDays)
    : calculationMethod === "simple"
      ? configuredSimpleInterest(availableBalance, annualRate, monthlyDays, daysBase)
    : calculationMethod === "simple360"
      ? configuredSimpleInterest(availableBalance, annualRate, monthlyDays, 360)
    : calculationMethod === "mifel360"
      ? mifelInterest(availableBalance, annualRate, monthlyDays)
    : calculationMethod === "openbank"
      ? openbankInterest(availableBalance, annualRate, excessRate, monthlyDays, daysBase)
    : configuredCompoundInterest(promoBalance, annualRate, monthlyDays) +
      configuredCompoundInterest(excessBalance, excessRate, monthlyDays);
  const totalAccumulated = Math.max(
    calculationMethod === "simple"
      ? configuredSimpleInterest(availableBalance, annualRate, daysElapsed, daysBase)
      : calculationMethod === "simple360"
        ? configuredSimpleInterest(availableBalance, annualRate, daysElapsed, 360)
      : calculationMethod === "compound"
        ? configuredCompoundInterest(promoBalance, annualRate, daysElapsed) +
          configuredCompoundInterest(excessBalance, excessRate, daysElapsed)
      : calculationMethod === "kubo"
        ? kuboInterest(availableBalance, annualRate, daysElapsed)
      : calculationMethod === "mifel360"
        ? mifelInterest(availableBalance, annualRate, daysElapsed)
      : calculationMethod === "openbank"
        ? openbankInterest(availableBalance, annualRate, excessRate, daysElapsed, daysBase)
      : completedMonthsBetween(startDate, calculationDate) > 0
          ? monthlyYield * completedMonthsBetween(startDate, calculationDate)
          : isFlexibleUltra
            ? flexibleUltraInterest(availableBalance, promoCap, daysElapsed, annualRate, excessRate, promotionDays)
            : configuredCompoundInterest(promoBalance, annualRate, daysElapsed) +
              configuredCompoundInterest(excessBalance, excessRate, daysElapsed),
  );
  const completedMonths = completedMonthsBetween(startDate, calculationDate);
  const calculatedUpdatedBalance = getCalculatedUpdatedBalance(
    availableBalance,
    totalAccumulated,
    calculationMethod,
    monthlyYield,
    completedMonths,
  );
  const updatedBalance = Math.max(
    0,
    calculate(
      formulas.updatedBalance,
      { availableBalance, totalAccumulated, monthlyYield, completedMonths },
      calculatedUpdatedBalance,
    ),
  );
  const nextMonthBalance = Math.max(
    0,
    availableBalance + monthlyYield,
  );
  const taxWithheld = dailyYield * (taxRate / 100);
  return {
    ...investment,
    promoCap,
    annualRate,
    monthlyYield,
    nextMonthBalance,
    updatedBalance: investment.updatedBalanceOverride ?? updatedBalance,
    nextMonthExcess: Math.max(0, nextMonthBalance - promoCap),
    calculatedAt: calculationDate.toISOString().slice(0, 10),
    daysElapsed,
    estimatedToday: Math.max(0, availableBalance + dailyYield),
    promotionalYield: calculationMethod === "flexible"
      ? flexibleUltraInterest(promoBalance, promoCap, daysElapsed, annualRate, excessRate, promotionDays)
      : calculationMethod === "mifel360"
        ? mifelInterest(promoBalance, annualRate, daysElapsed)
        : calculationMethod === "openbank"
          ? openbankInterest(promoBalance, annualRate, excessRate, daysElapsed)
          : configuredCompoundInterest(promoBalance, annualRate, daysElapsed),
    excessYield: configuredCompoundInterest(excessBalance, excessRate, daysElapsed),
    totalAccumulated,
    dailyYield,
    taxWithheld,
    netDailyYield: dailyYield - taxWithheld,
  };
};
const tabs: { id: Tab; label: string; icon: typeof WalletCards }[] = [
  { id: "vista", label: "A la vista", icon: WalletCards },
  { id: "plazo", label: "A plazo", icon: Clock3 },
  { id: "etf", label: "ETF", icon: LineChart },
];
export default function DashboardPage({
  institutions,
}: {
  institutions: Institution[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("vista");
  const [investments, setInvestments] = useState<Investment[]>(readLocalInvestments);
  const [editingBalances, setEditingBalances] = useState<Record<string, string>>({});
  const [activeBalanceId, setActiveBalanceId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [formulaStore, setFormulaStore] = useState<FormulaStore>({});
  const formulasFor = (investment: Investment) =>
    formulaStore[formulaKey(investment.institutionId, investment.productId)] ?? defaultFormulaConfig;
  const isKuboLiquidity = (investment: Investment) =>
    investment.institutionId === "kubo" && investment.type === "vista";
  const rolloverKuboLiquidity = (
    investment: Investment,
    calculatedInvestment: Investment,
  ) => {
    if (!isKuboLiquidity(investment) || !investment.calculatedAt) {
      return calculatedInvestment;
    }
    const availability = kuboAvailabilityDate(
      new Date(`${investment.calculatedAt}T00:00:00`),
    );
    const today = new Date().toISOString().slice(0, 10);
    if (today < availability) return calculatedInvestment;
    const reinvestedInvestment = {
      ...calculatedInvestment,
      balance: calculatedInvestment.updatedBalance,
      withdrawn: 0,
      startDate: availability,
      updatedBalanceOverride: undefined,
      updatedAt: new Date().toISOString(),
    };
    return calculateInvestment(
      reinvestedInvestment,
      institutions,
      formulasFor(reinvestedInvestment),
    );
  };
  useEffect(() => {
    fetch("/api/formulas", { headers: authHeaders() })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((saved: FormulaStore) => setFormulaStore(saved))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const refreshInvestments = async () => {
      try {
        const response = await fetch("/api/investments", {
          headers: authHeaders(),
        });
        if (!response.ok) throw new Error("API unavailable");
        const databaseInvestments: Investment[] = await response.json();
        const localInvestments = readLocalInvestments();
        const latestInvestments = databaseInvestments.map((databaseInvestment) => {
          const localInvestment = localInvestments.find(
            (investment) => investment.id === databaseInvestment.id,
          );
          return localInvestment?.updatedAt &&
            (!databaseInvestment.updatedAt ||
              localInvestment.updatedAt > databaseInvestment.updatedAt)
            ? localInvestment
            : databaseInvestment;
        });
        const recalculatedInvestments = latestInvestments.map((investment) =>
          rolloverKuboLiquidity(
            investment,
            calculateInvestment(investment, institutions, formulaStore[formulaKey(investment.institutionId, investment.productId)] ?? defaultFormulaConfig),
          ),
        );
        await Promise.all(
          recalculatedInvestments.map(async (investment, index) => {
            if (investment.updatedAt === latestInvestments[index].updatedAt && !isKuboLiquidity(investment)) return;
            if (investment.id && isKuboLiquidity(investment) && investment.startDate !== latestInvestments[index].startDate) {
              await fetch(`/api/investments/${investment.id}`, {
                method: "PUT",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(investment),
              });
            }
          }),
        );
        setInvestments(recalculatedInvestments);
        localStorage.setItem(investmentStorageKey(), JSON.stringify(recalculatedInvestments));
      } catch {
        const localInvestments = readLocalInvestments().map((investment) =>
          rolloverKuboLiquidity(
            investment,
            calculateInvestment(investment, institutions, formulaStore[formulaKey(investment.institutionId, investment.productId)] ?? defaultFormulaConfig),
          ),
        );
        setInvestments(localInvestments);
        localStorage.setItem(investmentStorageKey(), JSON.stringify(localInvestments));
      }
    };
    window.addEventListener("finanzia-investment-saved", refreshInvestments);
    window.addEventListener("finanzia-user-config-updated", refreshInvestments);
    window.addEventListener("storage", refreshInvestments);
    refreshInvestments();
    const refreshTimer = window.setInterval(refreshInvestments, 60000);
    return () => {
      window.removeEventListener("finanzia-investment-saved", refreshInvestments);
      window.removeEventListener("finanzia-user-config-updated", refreshInvestments);
      window.removeEventListener("storage", refreshInvestments);
      window.clearInterval(refreshTimer);
    };
  }, [institutions, formulaStore]);
  const investmentKey = (investment: Investment) =>
    String(
      investment.id ??
        `${investment.institutionId}-${investment.productId}-${investment.startDate}`,
    );
  const saveUpdatedBalance = async (
    investment: Investment,
    inputValue?: string,
  ) => {
    const key = investmentKey(investment);
    const value = Number(inputValue ?? editingBalances[key]);
    if (!Number.isFinite(value) || value < 0) return;
    const isEtf = investment.type === "etf";
    const reduction = Math.max(0, investment.updatedBalance - value);
    const updatedInvestment = {
      ...investment,
      ...(isEtf
        ? { etfCurrentValue: value, balance: value, updatedBalance: value }
        : {
            updatedBalanceOverride: value,
            updatedBalance: value,
            withdrawn: Number(investment.withdrawn || 0) + reduction,
          }),
      updatedAt: new Date().toISOString(),
    };
    try {
      if (investment.id) {
        const response = await fetch(`/api/investments/${investment.id}`, {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(updatedInvestment),
        });
        if (!response.ok) throw new Error("API unavailable");
        Object.assign(updatedInvestment, await response.json());
      }
      const nextInvestments = investments.map((item) =>
        investmentKey(item) === key
          ? calculateInvestment(updatedInvestment, institutions, formulasFor(updatedInvestment))
          : item,
      );
      setInvestments(nextInvestments);
      localStorage.setItem(investmentStorageKey(), JSON.stringify(nextInvestments));
      setEditingBalances((current) => ({ ...current, [key]: value.toFixed(2) }));
      setActiveBalanceId(null);
    } catch {
      const nextInvestments = investments.map((item) =>
        investmentKey(item) === key
          ? calculateInvestment(updatedInvestment, institutions, formulasFor(updatedInvestment))
          : item,
      );
      setInvestments(nextInvestments);
      localStorage.setItem(investmentStorageKey(), JSON.stringify(nextInvestments));
    }
  };
  const visible = investments
    .filter((investment) => investment.type === activeTab)
    .sort((first, second) => {
      const firstInstitution = institutions.find(
        (institution) => institution.id === first.institutionId,
      )?.name ?? first.institutionId;
      const secondInstitution = institutions.find(
        (institution) => institution.id === second.institutionId,
      )?.name ?? second.institutionId;
      const institutionOrder = firstInstitution.localeCompare(secondInstitution, "es");
      if (institutionOrder !== 0) return institutionOrder;
      const firstProduct = first.etfName ?? first.productId;
      const secondProduct = second.etfName ?? second.productId;
      return firstProduct.localeCompare(secondProduct, "es");
    });
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paginatedInvestments = visible.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const isKuboInvestment = (investment: Investment) =>
    investment.institutionId === "kubo";
  const kuboVistaInvestments = paginatedInvestments.filter(
    (investment) => isKuboInvestment(investment),
  );
  const standardInvestments = paginatedInvestments.filter(
    (investment) => !isKuboInvestment(investment),
  );
  const investmentRowClass = (investment: Investment) => {
    if (investment.type === "etf") {
      return etfMetrics(investment, formulasFor(investment)).gain >= 0 ? "mifel-limit-green" : "mifel-limit-red";
    }
    if (investment.type === "plazo") {
      const daysRemaining = daysUntilMaturity(investment);
      if (daysRemaining <= 0) return "mifel-limit-red";
      if (daysRemaining <= 10) return "mifel-limit-yellow";
      return "mifel-limit-green";
    }
    return "";
  };
  const institutionName = (id: string) =>
    institutions.find((institution) => institution.id === id)?.name ??
    "Institución eliminada";
  const productName = (investment: Investment) =>
    institutions
      .find((institution) => institution.id === investment.institutionId)
      ?.products.find((product) => product.id === investment.productId)?.name ??
    "Producto eliminado";
  const protectionName = (investment: Investment) =>
    investment.institutionId === "cetesdirecto" ? "Gobierno federal" : "IPAB";
  const daysUntilMaturity = (investment: Investment) => {
    if (!investment.endDate) return 0;
    return Math.max(
      0,
      Math.ceil(
        (new Date(`${investment.endDate}T00:00:00`).getTime() -
          new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`).getTime()) /
          86400000,
      ),
    );
  };
  const termDaysFor = (investment: Investment) => {
    if (investment.termDays) return investment.termDays;
    if (!investment.endDate) return investment.daysElapsed;
    return Math.max(
      0,
      Math.round(
        (new Date(`${investment.endDate}T00:00:00`).getTime() -
          new Date(`${investment.startDate}T00:00:00`).getTime()) /
          86400000,
      ),
    );
  };
  return (
    <div className="investment-page dashboard-page">
      <NavigationHeader pageLabel="Dashboard" />
      <main className="investment-content">
        <div className="investment-intro">
          <div>
            <span className="eyebrow orange">Resumen patrimonial</span>
            <h1>Dashboard</h1>
            <p>
              Consulta las inversiones registradas y sus valores calculados.
            </p>
          </div>
        </div>
        <nav className="investment-tabs" aria-label="Tipo de inversión">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => {
                setActiveTab(id);
                setCurrentPage(1);
              }}
            >
              <Icon size={18} />
              {label}
              <span className="tab-count">
                {
                  investments.filter((investment) => investment.type === id)
                    .length
                }
              </span>
            </button>
          ))}
        </nav>
        <section className="dashboard-table-section">
          <div className="table-heading">
            <div>
              <span className="eyebrow">Registros guardados</span>
              <h2>
                Inversiones{" "}
                {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}
              </h2>
            </div>
            <BarChart3 size={24} />
          </div>
          {visible.length ? (
            <>
            <div className="dashboard-mobile-cards">
              {paginatedInvestments.map((investment) => {
                const key = investmentKey(investment);
                const isEtf = investment.type === "etf";
                const etf = isEtf ? etfMetrics(investment, formulasFor(investment)) : null;
                const title = isEtf ? investment.etfName ?? investment.productId : productName(investment);
                const isKubo = isKuboInvestment(investment);
                const current = isEtf ? etf?.currentValue ?? 0 : investment.updatedBalance;
                const gain = isEtf ? etf?.gain ?? 0 : investment.totalAccumulated;
                return <article className="dashboard-mobile-card" key={key}>
                  <div className="dashboard-mobile-card-heading">
                    <div><span className="dashboard-mobile-label">{isEtf ? "ETF" : institutionName(investment.institutionId)}</span><h3>{title}</h3></div>
                    <span className={gain < 0 ? "mobile-value negative" : "mobile-value positive"}>{amount(gain)}</span>
                  </div>
                  <div className="dashboard-mobile-metrics">
                    <div><span>{isEtf || isKubo ? "Monto invertido" : "Saldo actual"}</span><strong>{amount(isEtf ? etf?.capitalInvested : investment.balance)}</strong></div>
                    <div><span>{isEtf ? "Valor actual" : isKubo ? "Monto a recibir" : "Saldo actualizado"}</span><strong>{amount(current)}</strong></div>
                    <div><span>{isEtf ? "Rendimiento" : isKubo ? "Intereses a recibir" : "Retirado"}</span><strong>{isEtf ? percentage(etf?.returnRate ?? 0) : isKubo ? amount(investment.totalAccumulated) : amount(investment.withdrawn)}</strong></div>
                  </div>
                  {isKubo && <div className="dashboard-mobile-term"><span>Tasa {percentage(investment.annualRate)} · Plazo diario</span><strong>{investment.startDate}</strong></div>}
                  {investment.type === "plazo" && <div className="dashboard-mobile-term"><span>{investment.startDate} → {investment.endDate ?? "Sin vencimiento"}</span><strong>{investment.endDate && investment.endDate <= new Date().toISOString().slice(0, 10) ? "Finalizada" : "En curso"}</strong></div>}
                  {!isEtf && investment.type !== "plazo" && <label className="dashboard-mobile-edit">Saldo actualizado<input type="number" min="0" step="0.01" value={editingBalances[key] ?? Number(investment.updatedBalance).toFixed(2)} onChange={(event) => setEditingBalances((currentBalances) => ({ ...currentBalances, [key]: event.target.value }))} onFocus={() => setActiveBalanceId(key)} onBlur={(event) => { void saveUpdatedBalance(investment, event.currentTarget.value); }} /></label>}
                </article>;
              })}
            </div>
            {kuboVistaInvestments.length > 0 && activeTab === "vista" && (
              <div className="table-scroll">
                <table className="kubo-dashboard-table">
                  <thead>
                    <tr>
                      <th>Institución</th>
                      <th>Producto</th>
                      <th>Monto invertido</th>
                      <th>Monto a recibir</th>
                      <th>Intereses a recibir</th>
                      <th>Tasa</th>
                      <th>Plazo</th>
                      <th>Fecha inicio</th>
                      <th>Fecha disponibilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kuboVistaInvestments.map((investment) => (
                      <tr key={investmentKey(investment)}>
                        <td><strong>{institutionName(investment.institutionId)}</strong></td>
                        <td>{productName(investment)}</td>
                        <td>{amount(investment.balance)}</td>
                        <td className="editable-dashboard-cell">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            readOnly={activeBalanceId !== investmentKey(investment)}
                            value={editingBalances[investmentKey(investment)] ?? Number(investment.updatedBalance).toFixed(2)}
                            onClick={() => {
                              const key = investmentKey(investment);
                              setActiveBalanceId(key);
                              setEditingBalances((current) => ({
                                ...current,
                                [key]: current[key] ?? Number(investment.updatedBalance).toFixed(2),
                              }));
                            }}
                            onChange={(event) => {
                              const key = investmentKey(investment);
                              setEditingBalances((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }));
                            }}
                            onBlur={(event) => {
                              const key = investmentKey(investment);
                              setEditingBalances((current) => ({
                                ...current,
                                [key]: Number(event.currentTarget.value).toFixed(2),
                              }));
                              void saveUpdatedBalance(investment, event.currentTarget.value);
                            }}
                          />
                        </td>
                        <td>{amount(investment.totalAccumulated)}</td>
                        <td>{percentage(investment.annualRate)}</td>
                        <td>Diario</td>
                        <td>{investment.startDate}</td>
                        <td>{kuboAvailabilityDate(new Date(`${investment.calculatedAt}T00:00:00`))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {standardInvestments.length > 0 && <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {activeTab === "etf" ? <>
                      <th>ETF</th>
                      <th>Títulos</th>
                      <th>Precio Compra Promedio</th>
                      <th>Precio Actual</th>
                      <th>Capital Invertido</th>
                      <th>Valor Actual</th>
                      <th>Ganancia</th>
                      <th>Rendimiento</th>
                      <th>Dividendo Anual %</th>
                      <th>Ingreso Div. Anual</th>
                      <th>Ingreso Div. Mensual</th>
                    </> : activeTab === "plazo" ? <>
                      <th>Institución</th>
                      <th>Plazo días</th>
                      <th>Monto invertido</th>
                      <th>Monto actual</th>
                      <th>Tasa</th>
                      <th>Fecha inversión</th>
                      <th>Fecha vencimiento</th>
                      <th>Días por vencer</th>
                      <th>Ganancia</th>
                      <th>Protección</th>
                      <th>Ganancia con reinversión</th>
                      <th>Monto final</th>
                    </> : <>
                      <th>Institución</th>
                      <th>Producto</th>
                      <th>Saldo actual</th>
                      <th>Tope promo</th>
                      <th>Tasa anual</th>
                      <th>Rend. mensual</th>
                      <th>Saldo próx. mes</th>
                      <th>Saldo actualizado</th>
                      <th>Excedente próx. mes</th>
                      <th>Fecha cálculo</th>
                      <th>Días transcurridos</th>
                      <th>Fecha inicio</th>
                      <th>Rend. promocional</th>
                      <th>Total acumulado</th>
                      <th>Rend. diario</th>
                      <th>ISR retenido</th>
                      <th>Rend. diario neto</th>
                      <th>Total retirado</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {standardInvestments.map((investment) => (
                    (() => {
                      const key = investmentKey(investment);
                      return (
                    <tr key={key} className={investmentRowClass(investment)}>
                      {activeTab === "etf" ? null : <td>
                        <strong>
                          {institutionName(investment.institutionId)}
                        </strong>
                      </td>}
                      {activeTab === "etf" ? (() => {
                        const metrics = etfMetrics(investment, formulasFor(investment));
                        return <>
                        <td><strong>{investment.etfName ?? investment.productId}</strong></td>
                        <td>{metrics.titles}</td>
                        <td>{amount(metrics.purchasePrice)}</td>
                        <td>{amount(metrics.currentPrice)}</td>
                        <td>{amount(metrics.capitalInvested)}</td>
                        <td className="etf-current-value editable-dashboard-cell">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            readOnly={activeBalanceId !== key}
                            value={editingBalances[key] ?? metrics.currentValue.toFixed(2)}
                            onClick={() => {
                              setActiveBalanceId(key);
                              setEditingBalances((current) => ({
                                ...current,
                                [key]: current[key] ?? metrics.currentValue.toFixed(2),
                              }));
                            }}
                            onChange={(event) =>
                              setEditingBalances((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            onBlur={(event) => {
                              const inputValue = event.currentTarget.value;
                              setEditingBalances((current) => ({
                                ...current,
                                [key]: Number(inputValue).toFixed(2),
                              }));
                              void saveUpdatedBalance(investment, inputValue);
                            }}
                          />
                        </td>
                        <td>{amount(metrics.gain)}</td>
                        <td>{percentage(metrics.returnRate)}</td>
                        <td>{percentage(metrics.dividendRate)}</td>
                        <td>{amount(metrics.annualDividendIncome)}</td>
                        <td>{amount(metrics.monthlyDividendIncome)}</td>
                        </>;
                      })() : activeTab === "plazo" ? <>
                        {(() => {
                          const product = institutions
                            .find((institution) => institution.id === investment.institutionId)
                            ?.products.find((item) => item.id === investment.productId);
                          const maturityInterest = product?.calculationMethod === "simple360"
                            ? bancoPlataInterest(
                                investment.balance,
                                investment.annualRate,
                                termDaysFor(investment),
                              )
                            : (() => {
                                const fallback = simpleInterest(investment.balance, investment.annualRate, termDaysFor(investment));
                                try {
                                  return evaluateFormula(
                                    formulasFor(investment).simpleInterest,
                                    { principal: investment.balance, annualRate: investment.annualRate, days: termDaysFor(investment) },
                                  );
                                } catch {
                                  return fallback;
                                }
                              })();
                          const finalAmount = investment.balance + maturityInterest;
                          return <>
                        <td>{termDaysFor(investment)}</td>
                        <td>{amount(investment.balance)}</td>
                        <td>{amount(finalAmount)}</td>
                        <td>{investment.annualRate.toFixed(2)}%</td>
                        <td>{investment.startDate}</td>
                        <td>{investment.endDate ?? "-"}</td>
                        <td>{daysUntilMaturity(investment)}</td>
                        <td>{amount(maturityInterest)}</td>
                        <td>{protectionName(investment)}</td>
                        <td>{amount(maturityInterest)}</td>
                        <td>{amount(finalAmount)}</td>
                          </>;
                        })()}
                      </> : <>
                      <td>{productName(investment)}</td>
                      <td>{amount(investment.updatedBalance)}</td>
                      <td>{amount(investment.promoCap)}</td>
                      <td>{investment.annualRate.toFixed(2)}%</td>
                      <td>{amount(investment.monthlyYield)}</td>
                      <td>
                        {amount(
                          institutions.find((institution) => institution.id === investment.institutionId)?.products.find((product) => product.id === investment.productId)?.calculationMethod === "kubo"
                            ? investment.updatedBalance
                            : investment.nextMonthBalance,
                        )}
                      </td>
                      <td className="editable-dashboard-cell">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          readOnly={activeBalanceId !== key}
                          value={editingBalances[key] ?? Number(investment.updatedBalance).toFixed(2)}
                          onClick={() => {
                            setActiveBalanceId(key);
                            setEditingBalances((current) => ({
                              ...current,
                              [key]: current[key] ?? Number(investment.updatedBalance).toFixed(2),
                            }));
                          }}
                          onChange={(event) =>
                            setEditingBalances((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          onBlur={(event) => {
                            const inputValue = event.currentTarget.value;
                            setEditingBalances((current) => ({
                              ...current,
                              [key]: Number(inputValue).toFixed(2),
                            }));
                            void saveUpdatedBalance(investment, inputValue);
                          }}
                        />
                      </td>
                      <td>{amount(investment.nextMonthExcess)}</td>
                      <td>{investment.calculatedAt}</td>
                      <td>{investment.daysElapsed}</td>
                      <td>{investment.startDate}</td>
                      <td>{amount(investment.promotionalYield)}</td>
                      <td>{amount(investment.totalAccumulated)}</td>
                      <td>{amount(investment.dailyYield)}</td>
                      <td>{amount(investment.taxWithheld)}</td>
                      <td>{amount(investment.netDailyYield)}</td>
                      <td>{amount(investment.withdrawn)}</td>
                      </>}
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>}
            <div className="dashboard-pagination">
              <label>
                Registros por página
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </label>
              <span>
                Página {Math.min(currentPage, totalPages)} de {totalPages}
              </span>
              <div className="dashboard-pagination-actions">
                <button
                  className="secondary-button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </button>
                <button
                  className="secondary-button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  Siguiente
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="dashboard-empty">
              <BarChart3 size={28} />
              <h3>Aún no hay inversiones registradas</h3>
              <p>
                Las inversiones guardadas desde el formulario aparecerán aquí.
              </p>
              <a className="primary-button" href="/inversiones">
                Registrar primera inversión
              </a>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function readLocalInvestments(): Investment[] {
  try {
    return JSON.parse(localStorage.getItem(investmentStorageKey()) ?? "[]");
  } catch {
    return [];
  }
}
