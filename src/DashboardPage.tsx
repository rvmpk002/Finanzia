import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Landmark,
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
  compoundInterest,
  resolveRateSplit,
  simpleInterest,
} from "./calculationEngine";
import NavigationHeader from "./NavigationHeader";
import { authHeaders, investmentStorageKey } from "./auth";
import { normalizeInvestmentType } from "./tabRules";
import {
  mercadoPagoMinimumBalanceWarningLabel,
  nuMinimumPurchaseWarningLabel,
  shouldShowMercadoPagoMinimumBalanceWarning,
  shouldShowNuMinimumPurchaseWarning,
} from "./warningRules";

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
  allowManualUpdatedBalanceOverride?: boolean;
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
  reinvestmentRule?: "no" | "capital" | "capital_e_intereses";
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
export const withdrawnAfterUpdatedBalanceEdit = (
  currentUpdatedBalance: number,
  editedUpdatedBalance: number,
  currentWithdrawn: number,
) => Math.max(
  0,
  currentWithdrawn + Math.max(0, currentUpdatedBalance - editedUpdatedBalance),
);
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
  return toLocalDateString(availability);
};
export const reinvestMaturedInvestments = (
  investments: Investment[],
  today = new Date(),
): Investment[] => investments.flatMap((investment) => {
  if (!investment.endDate || investment.reinvestmentRule === "no") return [investment];
  const maturityDate = new Date(`${investment.endDate}T00:00:00`);
  if (maturityDate > today) return [investment];

  const rolloverBase =
    investment.reinvestmentRule === "capital"
      ? Math.max(0, Number(investment.balance) || 0)
      : Math.max(0, Number(investment.updatedBalance) || 0);
  const nextTermDays = Math.max(1, Number(investment.termDays) || 30);
  const nextStartDate = toLocalDateString(today);
  const nextEndDate = new Date(today);
  nextEndDate.setDate(today.getDate() + nextTermDays);

  return [{
    ...investment,
    balance: rolloverBase,
    withdrawn: 0,
    updatedBalance: rolloverBase,
    updatedBalanceOverride: undefined,
    startDate: nextStartDate,
    endDate: toLocalDateString(nextEndDate),
    calculatedAt: nextStartDate,
    dailyYield: 0,
    monthlyYield: 0,
    nextMonthBalance: rolloverBase,
    estimatedToday: rolloverBase,
    totalAccumulated: 0,
    promotionalYield: 0,
    excessYield: 0,
    taxWithheld: 0,
    netDailyYield: 0,
    daysElapsed: 0,
    overwroteMatured: true,
  } as Investment];
});

export const resolveLatestInvestmentRecord = (
  databaseInvestment: Investment | undefined,
  localInvestment: Investment | undefined,
): Investment | undefined => {
  if (!databaseInvestment) return localInvestment;
  if (!localInvestment) return databaseInvestment;
  const localUpdatedAt = localInvestment.updatedAt ? new Date(localInvestment.updatedAt).getTime() : Number.NEGATIVE_INFINITY;
  const databaseUpdatedAt = databaseInvestment.updatedAt ? new Date(databaseInvestment.updatedAt).getTime() : Number.NEGATIVE_INFINITY;
  return localUpdatedAt > databaseUpdatedAt ? localInvestment : databaseInvestment;
};

export const calculateInvestment = (
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
  const isNuInvestment = investment.institutionId === "nu";
  const isOpenbankInvestment = investment.institutionId === "openbank";
  const openbankAnnualRate = 13;
  const openbankExcessRate = 7;
  const openbankDaysBase = 360;
  const allowManualUpdatedBalanceOverride = product?.allowManualUpdatedBalanceOverride ?? (isNuInvestment ? true : false);
  const hasManualUpdatedBalanceOverride = allowManualUpdatedBalanceOverride && Number.isFinite(Number(investment.updatedBalanceOverride));
  const isFlexibleUltra = product?.calculationMethod === "flexible";
  const calculationMethod = isOpenbankInvestment
    ? "openbank"
    : product?.calculationMethod ?? (investment.type === "plazo" ? "simple" : "compound");
  const taxRate = product?.taxRate ?? 0;
  const daysBase = product?.daysBase ?? 365;
  const promotionDays = product?.promotionDays ?? 60;
  const catalogPromoCap = product?.promoCap ?? 0;
  const promoCap = investment.promoCap ?? catalogPromoCap;
  const catalogAnnualRate = product?.annualRate ?? 0;
  const annualRate = isOpenbankInvestment ? openbankAnnualRate : investment.annualRate ?? catalogAnnualRate;
  const catalogExcessRate = product?.excessRate ?? annualRate;
  const excessRate = isOpenbankInvestment ? openbankExcessRate : investment.excessRate ?? catalogExcessRate;
  const calculationDaysBase = isOpenbankInvestment ? openbankDaysBase : daysBase;
  const balance = Math.max(0, Number(investment.balance) || 0);
  const withdrawn = Math.max(0, Number(investment.withdrawn) || 0);
  const manualUpdatedBalance = hasManualUpdatedBalanceOverride ? Number(investment.updatedBalanceOverride) : Number.NaN;
  const availableBalance = isNuInvestment
    ? Number.isFinite(manualUpdatedBalance)
      ? Math.max(0, manualUpdatedBalance)
      : Math.max(0, balance - withdrawn)
    : isOpenbankInvestment
      ? balance
    : Math.max(0, balance - withdrawn);
  const startDate = fromLocalDateString(investment.startDate);
  const isKubo = calculationMethod === "kubo";
  const isKuboTerm = isKubo && investment.type === "plazo";
  const todayKey = toLocalDateString(new Date());
  const calculationDate = fromLocalDateString(
    isKuboTerm ? investment.endDate ?? todayKey : todayKey,
  );
  const daysElapsed = Math.max(
    0,
    Math.floor(
      (calculationDate.getTime() - startDate.getTime()) / 86400000,
    ),
  );
  const effectiveKuboDays = isKubo
    ? Math.max(1, Number(investment.termDays) || daysElapsed)
    : daysElapsed;
  const monthlyDays = daysInMonth(calculationDate);
  const { promoBalance: splitPromoBalance, excessBalance: splitExcessBalance, effectiveExcessRate } = resolveRateSplit(
    availableBalance,
    annualRate,
    promoCap,
    excessRate,
  );
  const promoBalance = calculate(formulas.promotionalBalance, { availableBalance, promoCap }, splitPromoBalance);
  const excessBalance = calculate(formulas.excessBalance, { availableBalance, promoCap }, splitExcessBalance);
  const configuredSimpleInterest = (principal: number, rate: number, days: number, daysBase = 365) =>
    calculate(
      formulas.simpleInterest,
      { principal, annualRate: rate, days, daysBase },
      simpleInterest(principal, rate, days, daysBase),
    );
  const configuredCompoundInterest = (principal: number, rate: number, days: number) =>
    calculate(formulas.compoundInterest, { principal, annualRate: rate, days }, compoundInterest(principal, rate, days));
  const nuDailyYield = isNuInvestment ? (availableBalance * annualRate / 100) / 365 : 0;
  const nuMonthlyYield = isNuInvestment ? (availableBalance * annualRate / 100) / 12 : 0;
  const dailyYield = isNuInvestment
    ? nuDailyYield
    : calculationMethod === "flexible"
      ? flexibleUltraInterest(availableBalance, promoCap, 1, annualRate, excessRate, promotionDays)
      : calculationMethod === "kubo"
        ? kuboInterest(availableBalance, annualRate, effectiveKuboDays)
        : calculationMethod === "simple"
          ? configuredSimpleInterest(availableBalance, annualRate, 1, daysBase)
          : calculationMethod === "simple360"
            ? configuredSimpleInterest(availableBalance, annualRate, 1, 360)
            : calculationMethod === "mifel360"
              ? mifelInterest(availableBalance, annualRate, 1)
              : calculationMethod === "openbank"
                ? openbankInterest(availableBalance, annualRate, excessRate, 1, calculationDaysBase)
                : configuredCompoundInterest(promoBalance, annualRate, 1) +
                  configuredCompoundInterest(excessBalance, effectiveExcessRate, 1);
  const monthlyYield = isNuInvestment
    ? nuMonthlyYield
    : isFlexibleUltra
      ? flexibleUltraInterest(availableBalance, promoCap, monthlyDays, annualRate, excessRate, promotionDays)
      : calculationMethod === "simple"
        ? configuredSimpleInterest(availableBalance, annualRate, monthlyDays, daysBase)
        : calculationMethod === "simple360"
          ? configuredSimpleInterest(availableBalance, annualRate, monthlyDays, 360)
          : calculationMethod === "mifel360"
            ? mifelInterest(availableBalance, annualRate, monthlyDays)
            : calculationMethod === "openbank"
              ? openbankInterest(availableBalance, annualRate, excessRate, monthlyDays, calculationDaysBase)
              : configuredCompoundInterest(promoBalance, annualRate, monthlyDays) +
                configuredCompoundInterest(excessBalance, effectiveExcessRate, monthlyDays);
  const totalAccumulated = Math.max(
    isNuInvestment
      ? (availableBalance * annualRate / 100) * (daysElapsed / 365)
      : calculationMethod === "simple"
        ? configuredSimpleInterest(availableBalance, annualRate, daysElapsed, daysBase)
        : calculationMethod === "simple360"
          ? configuredSimpleInterest(availableBalance, annualRate, daysElapsed, 360)
          : calculationMethod === "compound"
            ? configuredCompoundInterest(promoBalance, annualRate, daysElapsed) +
              configuredCompoundInterest(excessBalance, effectiveExcessRate, daysElapsed)
            : calculationMethod === "kubo"
              ? kuboInterest(availableBalance, annualRate, effectiveKuboDays)
              : calculationMethod === "mifel360"
                ? mifelInterest(availableBalance, annualRate, daysElapsed)
                : calculationMethod === "openbank"
                  ? openbankInterest(availableBalance, annualRate, excessRate, daysElapsed, calculationDaysBase)
                  : completedMonthsBetween(startDate, calculationDate) > 0
                    ? monthlyYield * completedMonthsBetween(startDate, calculationDate)
                    : isFlexibleUltra
                      ? flexibleUltraInterest(availableBalance, promoCap, daysElapsed, annualRate, excessRate, promotionDays)
                      : configuredCompoundInterest(promoBalance, annualRate, daysElapsed) +
                        configuredCompoundInterest(excessBalance, effectiveExcessRate, daysElapsed),
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
  const resolvedUpdatedBalance = isNuInvestment
    ? Math.max(0, availableBalance + totalAccumulated)
    : updatedBalance;
  return {
    ...investment,
    balance: isNuInvestment ? resolvedUpdatedBalance : balance,
    promoCap,
    annualRate,
    monthlyYield,
    nextMonthBalance,
    updatedBalance: resolvedUpdatedBalance,
    nextMonthExcess: Math.max(0, nextMonthBalance - promoCap),
    calculatedAt: toLocalDateString(calculationDate),
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
export const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export const fromLocalDateString = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date();
  }
  return new Date(year, month - 1, day, 12, 0, 0);
};
const tabs: { id: Tab; label: string; icon: typeof WalletCards }[] = [
  { id: "vista", label: "A la vista", icon: WalletCards },
  { id: "plazo", label: "A plazo", icon: Clock3 },
  { id: "etf", label: "ETF", icon: LineChart },
];
const normalizedInvestmentType = (investment: Investment) =>
  normalizeInvestmentType(investment.institutionId, investment.type);
export default function DashboardPage({
  institutions,
}: {
  institutions: Institution[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("vista");
  const [investments, setInvestments] = useState<Investment[]>(() => reinvestMaturedInvestments(readLocalInvestments()));
  const [editingBalances, setEditingBalances] = useState<Record<string, string>>({});
  const [activeBalanceId, setActiveBalanceId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [formulaStore, setFormulaStore] = useState<FormulaStore>({});
  const formulasFor = (investment: Investment) =>
    formulaStore[formulaKey(investment.institutionId, investment.productId)] ?? defaultFormulaConfig;
  const isKuboLiquidity = (investment: Investment) =>
    investment.institutionId === "kubo" && normalizeInvestmentType(investment.institutionId, investment.type) === "plazo" && investment.type === "vista";
  const rolloverKuboLiquidity = (
    investment: Investment,
    calculatedInvestment: Investment,
  ) => {
    if (!isKuboLiquidity(investment) || !investment.calculatedAt) {
      return calculatedInvestment;
    }
    const availability = kuboAvailabilityDate(
      fromLocalDateString(investment.calculatedAt),
    );
    const today = toLocalDateString(new Date());
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
        const validInstitutionIds = new Set([
          ...institutions.map((institution) => institution.id),
          "etf",
        ]);
        const latestInvestments = databaseInvestments
          .filter((investment) => validInstitutionIds.has(investment.institutionId))
          .map((databaseInvestment) => {
            const localInvestment = localInvestments.find(
              (investment) => investment.id === databaseInvestment.id,
            );
            return resolveLatestInvestmentRecord(databaseInvestment, localInvestment);
          })
          .filter((investment): investment is Investment => Boolean(investment));
        const recalculatedInvestments = latestInvestments.map((investment) => {
          const normalized = investment.institutionId === "kubo" ? { ...investment, type: "plazo" as const } : investment;
          return rolloverKuboLiquidity(
            normalized,
            calculateInvestment(normalized, institutions, formulaStore[formulaKey(normalized.institutionId, normalized.productId)] ?? defaultFormulaConfig),
          );
        });
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
        const rolledInvestments = reinvestMaturedInvestments(recalculatedInvestments);
        setInvestments(rolledInvestments);
        localStorage.setItem(investmentStorageKey(), JSON.stringify(rolledInvestments));
      } catch {
        const localInvestments = readLocalInvestments().map((investment) => {
          const normalized = investment.institutionId === "kubo" ? { ...investment, type: "plazo" as const } : investment;
          return rolloverKuboLiquidity(
            normalized,
            calculateInvestment(normalized, institutions, formulaStore[formulaKey(normalized.institutionId, normalized.productId)] ?? defaultFormulaConfig),
          );
        });
        const rolledInvestments = reinvestMaturedInvestments(localInvestments);
        setInvestments(rolledInvestments);
        localStorage.setItem(investmentStorageKey(), JSON.stringify(rolledInvestments));
      }
    };
    window.addEventListener("finanzia-investment-saved", refreshInvestments);
    window.addEventListener("finanzia-user-config-updated", refreshInvestments);
    window.addEventListener("finanzia-institution-deleted", refreshInvestments);
    window.addEventListener("storage", refreshInvestments);
    refreshInvestments();
    const refreshTimer = window.setInterval(refreshInvestments, 60000);
    return () => {
      window.removeEventListener("finanzia-investment-saved", refreshInvestments);
      window.removeEventListener("finanzia-user-config-updated", refreshInvestments);
      window.removeEventListener("finanzia-institution-deleted", refreshInvestments);
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
    const product = institutions
      .find((institution) => institution.id === investment.institutionId)
      ?.products.find((item) => item.id === investment.productId);
    const allowManualOverride = product?.allowManualUpdatedBalanceOverride ?? true;
    const updatedWithdrawn = withdrawnAfterUpdatedBalanceEdit(
      Number(investment.updatedBalance) || 0,
      value,
      Number(investment.withdrawn) || 0,
    );
    const updatedInvestment = {
      ...investment,
      ...(isEtf
        ? { etfCurrentValue: value, balance: value, updatedBalance: value }
        : allowManualOverride
          ? {
              balance: value,
              updatedBalanceOverride: value,
              updatedBalance: value,
              withdrawn: updatedWithdrawn,
            }
          : {
              updatedBalanceOverride: value,
              updatedBalance: value,
              withdrawn: updatedWithdrawn,
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
        const serverInvestment = await response.json();
        Object.assign(updatedInvestment, serverInvestment, {
          balance: value,
          updatedBalanceOverride: value,
          updatedBalance: value,
          withdrawn: isEtf ? Number(investment.withdrawn || 0) : updatedWithdrawn,
          updatedAt: new Date().toISOString(),
        });
      }
      const nextInvestments = investments.map((item) =>
        investmentKey(item) === key
          ? calculateInvestment(updatedInvestment, institutions, formulasFor(updatedInvestment))
          : item,
      );
      setInvestments(nextInvestments);
      localStorage.setItem(investmentStorageKey(), JSON.stringify(nextInvestments));
      window.dispatchEvent(new Event("finanzia-investment-saved"));
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
      window.dispatchEvent(new Event("finanzia-investment-saved"));
    }
  };
  const visible = investments
    .filter((investment) => normalizedInvestmentType(investment) === activeTab)
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
    (investment) => isKuboInvestment(investment) && activeTab === "vista",
  );
  const kuboPlazoInvestments = paginatedInvestments.filter(
    (investment) => isKuboInvestment(investment) && activeTab === "plazo",
  );
  const standardInvestments = paginatedInvestments.filter(
    (investment) => !isKuboInvestment(investment),
  );
  const institutionName = (id: string) =>
    institutions.find((institution) => institution.id === id)?.name ??
    "Institución eliminada";
  const productName = (investment: Investment) =>
    institutions
      .find((institution) => institution.id === investment.institutionId)
      ?.products.find((product) => product.id === investment.productId)?.name ??
    "Producto eliminado";
  const vistaGainForDays = (investment: Investment, days: number) => {
    if (investment.institutionId === "openbank") {
      const principal = Math.max(0, Number(investment.balance) || 0);
      return openbankInterest(principal, 13, 7, days, 360);
    }
    return investment.dailyYield * days;
  };
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
  const plazoWarning = (investment: Investment) => {
    const remainingDays = daysUntilMaturity(investment);
    if (investment.type !== "plazo" || remainingDays > 10 || !investment.endDate) return null;
    return {
      remainingDays,
      label: `Quedan ${remainingDays} días para terminar inversión`,
    };
  };
  const mifelWarning = (investment: Investment) => {
    if (investment.institutionId !== "mifel" || investment.type !== "vista") return null;
    const updatedBalance = Number(investment.updatedBalance ?? investment.balance ?? 0);
    if (updatedBalance < 499500) return null;
    return { label: "retira 1000, ya que sobre el excedente de 500mil no genera intereses." };
  };
  const nuWarning = (investment: Investment) => {
    if (investment.institutionId !== "nu" || investment.type !== "vista") return null;
    if (!shouldShowNuMinimumPurchaseWarning(new Date())) return null;
    return { label: nuMinimumPurchaseWarningLabel };
  };
  const mercadoPagoWarning = (investment: Investment) => {
    if (investment.institutionId !== "mercado-pago" || !shouldShowMercadoPagoMinimumBalanceWarning(new Date())) return null;
    return { label: mercadoPagoMinimumBalanceWarningLabel };
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
                  investments.filter((investment) => normalizedInvestmentType(investment) === id)
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
                    <div className="dashboard-mobile-name-wrap">
                      <span className="dashboard-mobile-label">{isEtf ? "ETF" : institutionName(investment.institutionId)}</span>
                      <h3>{title}</h3>
                      {investment.type === "plazo" && (() => {
                        const warning = plazoWarning(investment);
                        return warning ? (
                          <span
                            className="term-warning-pill term-warning-pill-inline"
                            role="img"
                            aria-label={warning.label}
                            title={warning.label}
                          >
                            <Clock3 size={14} />
                            <span className="etf-warning-tooltip-bubble">{warning.label}</span>
                          </span>
                        ) : null;
                      })()}
                      {investment.type === "vista" && (() => {
                        const warning = mifelWarning(investment) ?? nuWarning(investment) ?? mercadoPagoWarning(investment);
                        if (!warning) return null;
                        const isMercadoPagoWarning = warning.label === mercadoPagoMinimumBalanceWarningLabel;
                        const isNuWarning = warning.label === nuMinimumPurchaseWarningLabel;
                        return (
                          <span
                            className={
                              isMercadoPagoWarning
                                ? "mercado-pago-warning-pill mifel-warning-pill-inline"
                                  : isNuWarning
                                    ? "nu-warning-pill mifel-warning-pill-inline"
                                    : "mifel-warning-pill mifel-warning-pill-inline"
                            }
                            role="img"
                            aria-label={warning.label}
                            title={warning.label}
                          >
                            {isMercadoPagoWarning ? <CircleDollarSign size={14} /> : isNuWarning ? <Landmark size={14} /> : <AlertTriangle size={14} />}
                            <span className="etf-warning-tooltip-bubble">{warning.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <div className="etf-gain-mobile-wrap">
                      <span className="mobile-value">{amount(gain)}</span>
                      {isEtf && gain < 0 && (
                        <span
                          className="etf-warning-pill"
                          role="img"
                          aria-label="No vender: ganancia negativa"
                          title="No vender: ganancia negativa"
                        >
                          <AlertTriangle size={14} />
                          <span className="etf-warning-tooltip-bubble">No vender: ganancia negativa</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="dashboard-mobile-metrics">
                    {investment.type === "vista" && !isKubo ? <>
                      <div><span>Monto inicial</span><strong>{amount(investment.balance)}</strong></div>
                      <div><span>Tope promo</span><strong>{amount(investment.promoCap)}</strong></div>
                      <div><span>Tasa anual</span><strong>{percentage(investment.annualRate)}</strong></div>
                      <div><span>Ganancia diaria</span><strong>{amount(vistaGainForDays(investment, 1))}</strong></div>
                      <div><span>Ganancia semanal</span><strong>{amount(vistaGainForDays(investment, 7))}</strong></div>
                      <div><span>Ganancia mensual</span><strong>{amount(vistaGainForDays(investment, 30))}</strong></div>
                      <div><span>Ganancia anual</span><strong>{amount(vistaGainForDays(investment, 365))}</strong></div>
                      <div><span>Total retirado</span><strong>{amount(investment.withdrawn)}</strong></div>
                    </> : <>
                      <div><span>{isEtf || isKubo ? "Monto invertido" : "Saldo actual"}</span><strong>{amount(isEtf ? etf?.capitalInvested : investment.balance)}</strong></div>
                      <div><span>{isEtf ? "Valor actual" : isKubo ? "Monto a recibir" : "Saldo actualizado"}</span><strong>{amount(current)}</strong></div>
                      <div><span>{isEtf ? "Rendimiento" : isKubo ? "Intereses a recibir" : "Retirado"}</span><strong>{isEtf ? percentage(etf?.returnRate ?? 0) : isKubo ? amount(investment.totalAccumulated) : amount(investment.withdrawn)}</strong></div>
                    </>}
                  </div>
                  {isKubo && <div className="dashboard-mobile-term"><span>Tasa {percentage(investment.annualRate)} · Plazo diario</span><strong>{investment.startDate}</strong></div>}
                  {investment.type === "plazo" && <div className="dashboard-mobile-term"><span>{investment.startDate} → {investment.endDate ?? "Sin vencimiento"}</span><strong>{investment.endDate && investment.endDate <= toLocalDateString(new Date()) ? "Finalizada" : "En curso"}</strong></div>}
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
            {kuboPlazoInvestments.length > 0 && activeTab === "plazo" && (
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
                    {kuboPlazoInvestments.map((investment) => (
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
                        <td>1-4 días</td>
                        <td>{investment.startDate}</td>
                        <td>{kuboAvailabilityDate(new Date(`${investment.calculatedAt}T00:00:00`))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {standardInvestments.length > 0 && <>
              {activeTab === "vista" && (
                <div className="calculation-note">
                  <strong>Mifel:</strong>
                  <span>
                    Los rendimientos y el ISR se calculan diariamente; si el día cae en fin de semana, el registro se refleja en el siguiente día hábil.
                  </span>
                </div>
              )}
              <div className="table-scroll">
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
                      <th>Monto inicial</th>
                      <th>Tope promo</th>
                      <th>Tasa anual</th>
                      <th>Ganancia diaria</th>
                      <th>Ganancia semanal</th>
                      <th>Ganancia mensual</th>
                      <th>Ganancia anual</th>
                      <th>Total retirado</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {standardInvestments.map((investment) => (
                    (() => {
                      const key = investmentKey(investment);
                      return (
                    <tr key={key}>
                      {activeTab === "etf" ? null : <td>
                        <div className="dashboard-plazo-name-wrap">
                          <strong>
                            {institutionName(investment.institutionId)}
                          </strong>
                          {investment.type === "plazo" && (() => {
                            const warning = plazoWarning(investment);
                            return warning ? (
                              <span
                                className="term-warning-pill term-warning-pill-inline"
                                role="img"
                                aria-label={warning.label}
                                title={warning.label}
                              >
                                <Clock3 size={14} />
                                <span className="etf-warning-tooltip-bubble">{warning.label}</span>
                              </span>
                            ) : null;
                          })()}
                          {investment.type === "vista" && (() => {
                            const warning = mifelWarning(investment) ?? nuWarning(investment) ?? mercadoPagoWarning(investment);
                            if (!warning) return null;
                            const isMercadoPagoWarning = warning.label === mercadoPagoMinimumBalanceWarningLabel;
                            const isNuWarning = warning.label === nuMinimumPurchaseWarningLabel;
                            return (
                              <span
                                className={
                                  isMercadoPagoWarning
                                    ? "mercado-pago-warning-pill mifel-warning-pill-inline"
                                    : isNuWarning
                                      ? "nu-warning-pill mifel-warning-pill-inline"
                                      : "mifel-warning-pill mifel-warning-pill-inline"
                                }
                                role="img"
                                aria-label={warning.label}
                                title={warning.label}
                              >
                                {isMercadoPagoWarning ? <CircleDollarSign size={14} /> : isNuWarning ? <Landmark size={14} /> : <AlertTriangle size={14} />}
                                <span className="etf-warning-tooltip-bubble">{warning.label}</span>
                              </span>
                            );
                          })()}
                        </div>
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
                        <td>
                          <div className="etf-gain-cell">
                            <span className={metrics.gain < 0 ? "negative-gain" : ""}>{amount(metrics.gain)}</span>
                            {metrics.gain < 0 && (
                              <span
                                className="etf-warning-pill"
                                role="img"
                                aria-label="No vender: ganancia negativa"
                                title="No vender: ganancia negativa"
                              >
                                <AlertTriangle size={14} />
                                <span className="etf-warning-tooltip-bubble">No vender: ganancia negativa</span>
                              </span>
                            )}
                          </div>
                        </td>
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
                      <td>{amount(investment.balance)}</td>
                      <td>{amount(investment.promoCap)}</td>
                      <td>{investment.annualRate.toFixed(2)}%</td>
                      <td>{amount(vistaGainForDays(investment, 1))}</td>
                      <td>{amount(vistaGainForDays(investment, 7))}</td>
                      <td>{amount(vistaGainForDays(investment, 30))}</td>
                      <td>{amount(vistaGainForDays(investment, 365))}</td>
                      <td>{amount(investment.withdrawn)}</td>
                      </>}
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
            </>}
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
