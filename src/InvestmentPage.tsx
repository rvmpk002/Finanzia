import { useEffect, useMemo, useState } from "react";
import { Clock3, FilePlus2, LineChart, WalletCards } from "lucide-react";
import NavigationHeader from "./NavigationHeader";
import { authHeaders, investmentStorageKey } from "./auth";
import { validateInvestmentInput } from "./validation";

type RateProduct = {
  id: string;
  name: string;
  promoCap?: number;
  annualRate?: number;
  excessRate?: number;
  calculationMethod?: "compound" | "simple" | "simple360" | "flexible" | "openbank" | "mifel360" | "kubo";
  daysBase?: number;
  taxRate?: number;
};
type Institution = { id: string; name: string; products: RateProduct[] };
type Tab = "vista" | "plazo" | "etf";
import { isSelectableInstitution, isSelectableProduct } from "./tabRules";
type SavedInvestment = {
  id?: number;
  type: Tab;
  institutionId: string;
  productId: string;
  investmentName?: string;
  balance: number;
  promoCap?: number;
  withdrawn: number;
  startDate: string;
  updatedBalance: number;
  totalAccumulated: number;
  annualRate?: number;
  excessRate?: number;
  termDays?: number;
  plataPlus?: boolean;
  reinvestmentRule?: "no" | "capital" | "capital_e_intereses";
  endDate?: string;
  etfName?: string;
  etfTitles?: number;
  etfPurchasePrice?: number;
  etfCurrentValue?: number;
  etfDividendRate?: number;
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const dateAfterDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return dateValue(result);
};
const parseDate = (value: string) =>
  value ? new Date(`${value}T00:00:00`) : new Date();
const compoundInterest = (
  principal: number,
  annualRate: number,
  days: number,
) => principal * (Math.pow(1 + annualRate / 100 / 365, days) - 1);
const simpleInterest = (principal: number, annualRate: number, days: number) =>
  principal * (annualRate / 100) * (days / 365);
const officialMonthlyInterest = (
  principal: number,
  annualRate: number,
  days: number,
) => compoundInterest(principal, annualRate, days);
const mifelInterest = (principal: number, annualRate: number, days: number) =>
  principal * (annualRate / 100) * (days / 360);
const openbankInterest = (
  principal: number,
  annualRate: number,
  excessRate: number,
  days: number,
) => {
  const firstTier = Math.min(principal, 30000);
  const secondTier = Math.min(Math.max(0, principal - 30000), 970000);
  const thirdTier = Math.max(0, principal - 1000000);
  const upperTierRate = 6.5;
  return (
    ((firstTier * annualRate) / 100 +
      (secondTier * excessRate) / 100 +
      (thirdTier * upperTierRate) / 100) *
    (days / 360)
  );
};
const didiInterest = (principal: number, days: number) => {
  const firstTier = Math.min(Math.max(0, principal), 10000);
  const excess = Math.max(0, principal - 10000);
  return (firstTier * 0.15 + excess * 0.075) * (days / 360);
};
const didiNetInterest = (principal: number, days: number) =>
  didiInterest(principal, days) * (1 - 0.03335);
const mercadoPagoInterest = (principal: number, days: number) =>
  Math.min(Math.max(0, principal), 25000) * 0.12 * (days / 365);
const kuboInterest = (principal: number, annualRate: number, days: number) => {
  const kuboEffectiveTaxRate = 0.077;
  return principal * (annualRate / 100) * (days / 365) * (1 - kuboEffectiveTaxRate);
};
const flexibleUltraInterest = (
  principal: number,
  promoCap: number,
  days: number,
  promoRate: number,
  excessRate: number,
) => {
  const promoDays = Math.min(days, 60);
  const remainingDays = Math.max(0, days - 60);
  const promoAmount = Math.min(principal, promoCap);
  const excessAmount = Math.max(0, principal - promoCap);
  const promoValue =
    promoAmount * Math.pow(1 + promoRate / 100 / 365, promoDays);
  const excessValue =
    excessAmount * Math.pow(1 + excessRate / 100 / 365, promoDays);
  return (
    promoValue * Math.pow(1 + excessRate / 100 / 365, remainingDays) +
    excessValue * Math.pow(1 + excessRate / 100 / 365, remainingDays) -
    principal
  );
};
const daysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const completedMonthsBetween = (startDate: Date, calculationDate: Date) => {
  let months =
    (calculationDate.getFullYear() - startDate.getFullYear()) * 12 +
    calculationDate.getMonth() -
    startDate.getMonth();
  if (calculationDate.getDate() < startDate.getDate()) months -= 1;
  return Math.max(0, months);
};
const sameInvestment = (first: SavedInvestment, second: SavedInvestment) =>
  first.institutionId === second.institutionId &&
  first.productId === second.productId &&
  first.startDate === second.startDate &&
  first.balance === second.balance;

const defaultRateFor = (
  institutionId: string,
  product: RateProduct | undefined,
) => {
  if (institutionId !== "banco-plata" || !product)
    return product?.annualRate ?? 0;
  if (product.id === "ahorro-flexible") return 15;
  if (product.id === "ahorro-fijo") return 11;
  return product?.annualRate ?? 0;
};

export default function InvestmentPage({
  institutions,
}: {
  institutions: Institution[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("vista");
  const [institutionId, setInstitutionId] = useState("");
  const [productId, setProductId] = useState("");
  const [investmentName, setInvestmentName] = useState("");
  const [plataPlus, setPlataPlus] = useState(false);
  const [fixedRate, setFixedRate] = useState("7");
  const [promoCapInput, setPromoCapInput] = useState("0");
  const [excessRateInput, setExcessRateInput] = useState("0");
  const [reinvestmentRule, setReinvestmentRule] = useState<"no" | "capital" | "capital_e_intereses">("capital_e_intereses");
  const [balance, setBalance] = useState("0");
  const [withdrawn, setWithdrawn] = useState("0");
  const [startDate, setStartDate] = useState(dateValue(new Date()));
  const [endDate, setEndDate] = useState(dateAfterDays(new Date(), 30));
  const [termDays, setTermDays] = useState("30");
  const [etfName, setEtfName] = useState("");
  const [etfTitles, setEtfTitles] = useState("0");
  const [etfPurchasePrice, setEtfPurchasePrice] = useState("0");
  const [etfCurrentValue, setEtfCurrentValue] = useState("0");
  const [etfDividendRate, setEtfDividendRate] = useState("0");
  const [calculationDate] = useState(() => parseDate(dateValue(new Date())));
  const [savedMessage, setSavedMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [savedInvestments, setSavedInvestments] = useState<SavedInvestment[]>(
    [],
  );
  const [editingInvestmentId, setEditingInvestmentId] = useState<number | null>(
    null,
  );
  const [editingLocalInvestment, setEditingLocalInvestment] =
    useState<SavedInvestment | null>(null);
  const [savedPageSize, setSavedPageSize] = useState(5);
  const [savedPage, setSavedPage] = useState(1);
  const tabs: { id: Tab; label: string; icon: typeof WalletCards }[] = [
    { id: "vista", label: "Inversión a la vista", icon: WalletCards },
    { id: "plazo", label: "Inversión a plazo", icon: Clock3 },
    { id: "etf", label: "Inversión ETF", icon: LineChart },
  ];
  const sortedInstitutions = [...institutions].sort((first, second) =>
    first.name.localeCompare(second.name, "es"),
  );
  const selectedInstitution = institutions.find(
    (item) => item.id === institutionId,
  );
  const products = selectedInstitution?.products ?? [];
  const productsWithRate = products.filter((product) =>
    isSelectableProduct(institutionId, product, activeTab),
  );
  const selectedProduct =
    productsWithRate.find((item) => item.id === productId) ??
    productsWithRate[0];
  const currentBalance = Math.max(0, Number(balance) || 0);
  const currentEtfValue = Math.max(0, Number(etfCurrentValue) || 0);
  const totalWithdrawn = Math.max(0, Number(withdrawn) || 0);
  const availableBalance = Math.max(0, currentBalance - totalWithdrawn);
  const isFlexibleUltra =
    institutionId === "banco-plata" &&
    selectedProduct?.id === "ahorro-flexible";
  const isDidi = institutionId === "didi-cuenta";
  const isKubo = institutionId === "kubo";
  const isKuboTerm = isKubo && activeTab === "plazo";
  const isMifel = institutionId === "mifel";
  const isOpenbank = institutionId === "openbank";
  const isMercadoPago = institutionId === "mercado-pago";
  const canonicalMifelPromoCap = 500000;
  const promoCap = isMifel ? canonicalMifelPromoCap : Math.max(0, Number(promoCapInput) || 0);
  const annualRate = selectedProduct ? Number(fixedRate) : 0;
  const excessRate = Math.max(0, Number(excessRateInput) || 0);
  const effectiveKuboDays = isKubo
    ? Math.max(1, Number(termDays) || Math.max(1, Math.floor((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86400000)))
    : 0;
  const daysElapsed = Math.max(
    0,
    Math.floor(
      ((isKuboTerm ? parseDate(endDate) : calculationDate).getTime() -
        parseDate(startDate).getTime()) /
        86400000,
    ),
  );
  const monthlyDays = daysInMonth(calculationDate);
  const promoBalance = Math.min(availableBalance, promoCap);
  const excessBalance = Math.max(0, availableBalance - promoCap);
  const dailyYield = isFlexibleUltra
    ? flexibleUltraInterest(
        availableBalance,
        promoCap,
        1,
        annualRate,
        excessRate,
      )
    : isKubo
      ? kuboInterest(availableBalance, annualRate, effectiveKuboDays)
      : isMifel
        ? mifelInterest(availableBalance, annualRate, 1)
        : isDidi
          ? didiNetInterest(availableBalance, 1)
        : isMercadoPago
          ? mercadoPagoInterest(availableBalance, 1)
          : isOpenbank
          ? openbankInterest(
              availableBalance,
              annualRate,
              excessRate,
              1,
            )
          : compoundInterest(promoBalance, annualRate, 1) +
            compoundInterest(excessBalance, excessRate, 1);
  const monthlyYield = isFlexibleUltra
    ? flexibleUltraInterest(
        availableBalance,
        promoCap,
        monthlyDays,
        annualRate,
        excessRate,
      )
    : isMifel
      ? mifelInterest(availableBalance, annualRate, monthlyDays)
      : isDidi
        ? didiNetInterest(availableBalance, monthlyDays)
      : isMercadoPago
        ? mercadoPagoInterest(availableBalance, monthlyDays)
        : isOpenbank
        ? openbankInterest(availableBalance, annualRate, excessRate, monthlyDays)
        : officialMonthlyInterest(promoBalance, annualRate, monthlyDays) +
          officialMonthlyInterest(excessBalance, excessRate, monthlyDays);
  const totalAccumulated = Math.max(
    0,
    activeTab === "plazo"
      ? simpleInterest(availableBalance, annualRate, daysElapsed)
      : isDidi
        ? compoundInterest(promoBalance, annualRate, daysElapsed) +
          compoundInterest(excessBalance, excessRate, daysElapsed)
        : isKubo
          ? kuboInterest(availableBalance, annualRate, effectiveKuboDays)
          : isMifel
            ? mifelInterest(availableBalance, annualRate, daysElapsed)
            : isDidi
              ? didiNetInterest(availableBalance, daysElapsed)
            : isMercadoPago
              ? mercadoPagoInterest(availableBalance, daysElapsed)
              : isOpenbank
              ? openbankInterest(
                  availableBalance,
                  annualRate,
                  excessRate,
                  daysElapsed,
                )
              : completedMonthsBetween(parseDate(startDate), calculationDate) >
                  0
                ? monthlyYield *
                  completedMonthsBetween(parseDate(startDate), calculationDate)
                : isFlexibleUltra
                  ? flexibleUltraInterest(
                      availableBalance,
                      promoCap,
                      daysElapsed,
                      annualRate,
                      excessRate,
                    )
                  : compoundInterest(promoBalance, annualRate, daysElapsed) +
                    compoundInterest(excessBalance, excessRate, daysElapsed),
  );
  const completedMonths = completedMonthsBetween(
    parseDate(startDate),
    calculationDate,
  );
  const updatedBalance = Math.max(
    0,
    availableBalance +
      (isDidi || isKubo || isOpenbank || isMifel
        ? totalAccumulated
        : monthlyYield * completedMonths) -
      0,
  );
  const nextMonthBalance = Math.max(
    0,
    availableBalance + (isKubo ? totalAccumulated : monthlyYield),
  );
  const estimatedToday = Math.max(0, availableBalance + dailyYield);
  const taxWithheld = isMifel ? dailyYield * 0.09 : 0;
  const netDailyYield = dailyYield - taxWithheld;
  
  // Determine which simulator to show and in which tab
  const getSimulatorInfo = () => {
    if (!institutionId || activeTab === "etf") return null;
    const viewAccountSimulators = ["nu", "mercado-pago", "openbank", "mifel", "didi-cuenta"];
    const fixedTermSimulators = ["cetesdirecto", "banco-plata", "kubo"];
    
    if (viewAccountSimulators.includes(institutionId)) {
      return activeTab === "vista" ? institutionId : null;
    }
    if (fixedTermSimulators.includes(institutionId)) {
      return activeTab === "plazo" ? institutionId : null;
    }
    return "generic";
  };
  
  const institutionCalculatorType = getSimulatorInfo();
  const institutionNameForSimulator =
    institutionId === "nu" ? "Nu" :
    institutionId === "mercado-pago" ? "Mercado Pago" :
    institutionId === "openbank" ? "Openbank" :
    institutionId === "mifel" ? "Mifel" :
    institutionId === "didi-cuenta" ? "DiDi Cuenta" :
    institutionId === "cetesdirecto" ? "Cetes Directo" :
    institutionId === "banco-plata" ? "Banco Plata" :
    institutionId === "kubo" ? "Kubo Financiero" :
    selectedInstitution?.name || "Institución";

  const institutionSimulatorIcon =
    institutionId === "nu" ? "NU" :
    institutionId === "mercado-pago" ? "MP" :
    institutionId === "openbank" ? "OB" :
    institutionId === "mifel" ? "M" :
    institutionId === "didi-cuenta" ? "DD" :
    institutionId === "cetesdirecto" ? "C" :
    institutionId === "banco-plata" ? "B" :
    institutionId === "kubo" ? "K" :
    (selectedInstitution?.name ? selectedInstitution.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() : "IN");

  const institutionSimulatorSubtitle =
    institutionId === "nu" ? "Rendimiento compuesto al 13% anual." :
    institutionId === "mercado-pago" ? "Rendimiento en primeros $25,000 a 12% anual." :
    institutionId === "openbank" ? "Tramos: 13% (primeros $30k), 7% ($30-$1M), 6.5% (resto)." :
    institutionId === "mifel" ? "Rendimiento 10% anual con impuesto estimado 9%." :
    institutionId === "didi-cuenta" ? "Tramos: 15% (primeros $10k), 7.5% (resto)." :
    institutionId === "cetesdirecto" ? "Simula la ganancia por plazo y tasa anual." :
    institutionId === "banco-plata" ? "Considera tope promocional y saldo excedente." :
    institutionId === "kubo" ? "Ajusta por la retención estimada anual." :
    activeTab === "vista"
      ? `Rendimiento proyectado al ${annualRate}% anual compuesto.`
      : `Simula la ganancia a plazo fijo (${termDays || 1} días) al ${annualRate}% anual.`;

  const institutionSimulatorVisible = Boolean(institutionCalculatorType);
  const institutionSimulator = useMemo(() => {
    const principal = Math.max(0, Number(balance) || 0);
    const annualRate = Math.max(0, Number(fixedRate) || 0);
    const days = Math.max(1, Number(termDays) || 1);
    const promo = Math.max(0, Number(promoCapInput) || 0);
    const baseDailyRate = annualRate / 100 / 365;
    
    // Nu - Compound interest
    if (institutionCalculatorType === "nu") {
      const dailyGain = principal * (Math.pow(1 + annualRate / 100 / 365, 1) - 1);
      const weeklyGain = principal * (Math.pow(1 + annualRate / 100 / 365, 7) - 1);
      const monthlyGain = principal * (Math.pow(1 + annualRate / 100 / 365, 30) - 1);
      const annualGain = principal * (Math.pow(1 + annualRate / 100 / 365, 365) - 1);
      const finalAmount = principal + principal * (Math.pow(1 + annualRate / 100 / 365, days) - 1);
      return {
        title: "Nu - Cajita Turbo",
        subtitle: "Rendimiento compuesto diario",
        dailyGain,
        weeklyGain,
        monthlyGain,
        annualGain,
        finalAmount,
      };
    }
    
    // Mercado Pago - Compound but capped at $25k
    if (institutionCalculatorType === "mercado-pago") {
      const cappedPrincipal = Math.min(principal, promo || 25000);
      const dailyGain = cappedPrincipal * (Math.pow(1 + annualRate / 100 / 365, 1) - 1);
      const weeklyGain = cappedPrincipal * (Math.pow(1 + annualRate / 100 / 365, 7) - 1);
      const monthlyGain = cappedPrincipal * (Math.pow(1 + annualRate / 100 / 365, 30) - 1);
      const annualGain = cappedPrincipal * (Math.pow(1 + annualRate / 100 / 365, 365) - 1);
      const finalAmount = cappedPrincipal + cappedPrincipal * (Math.pow(1 + annualRate / 100 / 365, days) - 1);
      return {
        title: "Mercado Pago",
        subtitle: "Solo primeros $25,000",
        dailyGain,
        weeklyGain,
        monthlyGain,
        annualGain,
        finalAmount,
      };
    }
    
    // Openbank - Tiered interest
    if (institutionCalculatorType === "openbank") {
      const firstTier = Math.min(principal, 30000);
      const secondTier = Math.min(Math.max(0, principal - 30000), 970000);
      const thirdTier = Math.max(0, principal - 1000000);
      const upperTierRate = 6.5;
      
      const dailyInterest = ((firstTier * annualRate) / 100 + (secondTier * (promo || 7)) / 100 + (thirdTier * upperTierRate) / 100) / 360;
      const dailyGain = dailyInterest;
      const weeklyGain = dailyInterest * 7;
      const monthlyGain = dailyInterest * 30;
      const annualGain = (firstTier * annualRate) / 100 + (secondTier * (promo || 7)) / 100 + (thirdTier * upperTierRate) / 100;
      const finalAmount = principal + ((firstTier * annualRate) / 100 + (secondTier * (promo || 7)) / 100 + (thirdTier * upperTierRate) / 100) * (days / 360);
      return {
        title: "Openbank",
        subtitle: "Tiempos escalonados",
        dailyGain,
        weeklyGain,
        monthlyGain,
        annualGain,
        finalAmount,
      };
    }
    
    // Mifel - Simple interest with 9% tax
    if (institutionCalculatorType === "mifel") {
      const interestBeforeTax = principal * (annualRate / 100) * (days / 360);
      const taxAmount = interestBeforeTax * 0.09;
      const dailyInterestBeforeTax = principal * (annualRate / 100) / 360;
      const dailyTax = dailyInterestBeforeTax * 0.09;
      
      const dailyGain = dailyInterestBeforeTax - dailyTax;
      const weeklyGain = (principal * (annualRate / 100) * (7 / 360)) * (1 - 0.09);
      const monthlyGain = (principal * (annualRate / 100) * (30 / 360)) * (1 - 0.09);
      const annualGain = (principal * (annualRate / 100)) * (1 - 0.09);
      const finalAmount = principal + interestBeforeTax - taxAmount;
      return {
        title: "Mifel",
        subtitle: "Con impuesto 9%",
        dailyGain,
        weeklyGain,
        monthlyGain,
        annualGain,
        finalAmount,
      };
    }
    
    // DiDi Cuenta - Tiered interest
    if (institutionCalculatorType === "didi-cuenta") {
      const firstTier = Math.min(Math.max(0, principal), promo || 10000);
      const excess = Math.max(0, principal - (promo || 10000));
      const excessRate = 7.5;
      
      const dailyInterest = ((firstTier * annualRate) / 100 + (excess * excessRate) / 100) / 360;
      const dailyGain = dailyInterest;
      const weeklyGain = dailyInterest * 7;
      const monthlyGain = dailyInterest * 30;
      const annualGain = (firstTier * annualRate) / 100 + (excess * excessRate) / 100;
      const finalAmount = principal + ((firstTier * annualRate) / 100 + (excess * excessRate) / 100) * (days / 360);
      return {
        title: "DiDi Cuenta",
        subtitle: "Tramos diferenciados",
        dailyGain,
        weeklyGain,
        monthlyGain,
        annualGain,
        finalAmount,
      };
    }
    
    // Original calculators for fixed-term products
    if (institutionCalculatorType === "cetesdirecto") {
      const dailyGain = principal * baseDailyRate;
      const weeklyGain = principal * (annualRate / 100) * (7 / 365);
      const monthlyGain = principal * (annualRate / 100) * (30 / 365);
      const annualGain = principal * (annualRate / 100);
      const finalAmount = principal + principal * (annualRate / 100) * (days / 365);
      return {
        title: "Cetes Directo",
        subtitle: "Rendimiento anual fijo",
        dailyGain,
        weeklyGain,
        monthlyGain,
        annualGain,
        finalAmount,
      };
    }
    if (institutionCalculatorType === "banco-plata") {
      const promotableAmount = Math.min(principal, promo || principal);
      const excessAmount = Math.max(0, principal - (promo || principal));
      const dailyGain = (promotableAmount * (annualRate / 100) + excessAmount * (annualRate / 100)) / 365;
      const weeklyGain = dailyGain * 7;
      const monthlyGain = principal * (annualRate / 100) * (30 / 365);
      const annualGain = principal * (annualRate / 100);
      const finalAmount = principal + principal * (annualRate / 100) * (days / 360);
      return {
        title: "Banco Plata",
        subtitle: "Rendimiento basado en saldo y plazo",
        dailyGain,
        weeklyGain,
        monthlyGain,
        annualGain,
        finalAmount,
      };
    }
    if (institutionCalculatorType === "kubo") {
      const effectiveRate = annualRate * (1 - 0.077);
      const cycleGain = principal * (effectiveRate / 100) * (days / 365);
      const finalAmount = principal + cycleGain;
      const nextCycleAmount = finalAmount * (1 + (effectiveRate / 100) * (days / 365));
      const annualizedProjection = principal * Math.pow(1 + effectiveRate / 100, 1);
      return {
        title: "Kubo Financiero",
        subtitle: "Reinversión automática con tasa vigente",
        dailyGain: principal * (effectiveRate / 100) / 365,
        weeklyGain: cycleGain * (7 / days),
        monthlyGain: cycleGain * (30 / days),
        annualGain: annualizedProjection - principal,
        finalAmount,
        nextCycleAmount,
      };
    }

    // Generic Simulator for new or custom institutions and products
    if (institutionCalculatorType === "generic") {
      const daysBase = selectedProduct?.daysBase || 365;
      const taxRate = (selectedProduct?.taxRate || 0) / 100;
      const effectiveExcessRate = Math.max(0, Number(excessRateInput) || (selectedProduct?.excessRate || 0));
      const calculationMethod = selectedProduct?.calculationMethod || (activeTab === "vista" ? "compound" : "simple");

      if (activeTab === "vista" || calculationMethod === "compound" || calculationMethod === "flexible") {
        const effectivePromoCap = promo > 0 ? promo : (selectedProduct?.promoCap || 0);
        const hasSplit = effectivePromoCap > 0 && effectiveExcessRate > 0;
        
        const calcCompound = (p: number, d: number) => {
          if (hasSplit) {
            const firstTier = Math.min(p, effectivePromoCap);
            const excess = Math.max(0, p - effectivePromoCap);
            const gain1 = firstTier * (Math.pow(1 + annualRate / 100 / daysBase, d) - 1);
            const gain2 = excess * (Math.pow(1 + effectiveExcessRate / 100 / daysBase, d) - 1);
            return (gain1 + gain2) * (1 - taxRate);
          } else if (effectivePromoCap > 0 && effectiveExcessRate === 0) {
            const capped = Math.min(p, effectivePromoCap);
            return capped * (Math.pow(1 + annualRate / 100 / daysBase, d) - 1) * (1 - taxRate);
          }
          return p * (Math.pow(1 + annualRate / 100 / daysBase, d) - 1) * (1 - taxRate);
        };

        const dailyGain = calcCompound(principal, 1);
        const weeklyGain = calcCompound(principal, 7);
        const monthlyGain = calcCompound(principal, 30);
        const annualGain = calcCompound(principal, daysBase);
        const finalAmount = principal + calcCompound(principal, days);

        return {
          title: selectedInstitution?.name || "Simulador",
          subtitle: selectedProduct?.name ? `${selectedProduct.name} • ${annualRate}% anual` : `Rendimiento compuesto al ${annualRate}% anual`,
          dailyGain,
          weeklyGain,
          monthlyGain,
          annualGain,
          finalAmount,
        };
      } else {
        // Fixed term / simple interest
        const effectivePromoCap = promo > 0 ? promo : (selectedProduct?.promoCap || 0);
        const hasSplit = effectivePromoCap > 0 && effectiveExcessRate > 0;

        const calcSimple = (p: number, d: number) => {
          if (hasSplit) {
            const firstTier = Math.min(p, effectivePromoCap);
            const excess = Math.max(0, p - effectivePromoCap);
            const interest = ((firstTier * annualRate / 100) + (excess * effectiveExcessRate / 100)) * (d / daysBase);
            return interest * (1 - taxRate);
          }
          return p * (annualRate / 100) * (d / daysBase) * (1 - taxRate);
        };

        const dailyGain = calcSimple(principal, 1);
        const weeklyGain = calcSimple(principal, 7);
        const monthlyGain = calcSimple(principal, 30);
        const annualGain = calcSimple(principal, daysBase);
        const finalAmount = principal + calcSimple(principal, days);

        return {
          title: selectedInstitution?.name || "Simulador",
          subtitle: selectedProduct?.name ? `${selectedProduct.name} • ${annualRate}% anual (${days} días)` : `Rendimiento a plazo (${days} días) al ${annualRate}% anual`,
          dailyGain,
          weeklyGain,
          monthlyGain,
          annualGain,
          finalAmount,
        };
      }
    }

  }, [
    balance,
    fixedRate,
    institutionCalculatorType,
    promoCapInput,
    termDays,
    activeTab,
    selectedInstitution?.name,
    selectedProduct?.name,
    selectedProduct?.daysBase,
    selectedProduct?.taxRate,
    selectedProduct?.calculationMethod,
    selectedProduct?.excessRate,
    selectedProduct?.promoCap,
    excessRateInput,
  ]);
  const canSave =
    activeTab === "etf"
      ? Boolean(etfName.trim() && Number(etfTitles) > 0 && currentEtfValue > 0)
      : Boolean(
          investmentName.trim() &&
          institutionId &&
          productId &&
          currentBalance > 0 &&
          startDate &&
          (!isMifel || currentBalance <= promoCap),
        );
  const exceedsMifelLimit = isMifel && currentBalance > promoCap;
  const setInstitution = (value: string) => {
    setInstitutionId(value);
    setPlataPlus(false);
    setSimulatorOpen(false);
    const nextProduct = institutions
      .find((item) => item.id === value)
      ?.products.find((product) =>
        isSelectableProduct(value, product, activeTab),
      );
    setProductId(nextProduct?.id ?? "");
    setFixedRate(String(defaultRateFor(value, nextProduct)));
    setPromoCapInput(String(nextProduct?.promoCap ?? (value === "mifel" ? 500000 : 0)));
    setExcessRateInput(String(nextProduct?.excessRate ?? 0));
    setSavedMessage("");
  };
  useEffect(() => {
    if (!institutionSimulatorVisible) setSimulatorOpen(false);
  }, [institutionSimulatorVisible]);
  useEffect(() => {
    const loadInvestments = async () => {
      try {
        const response = await fetch("/api/investments", {
          headers: authHeaders(),
        });
        setSavedInvestments(
          response.ok
            ? await response.json()
            : JSON.parse(localStorage.getItem(investmentStorageKey()) ?? "[]"),
        );
      } catch {
        setSavedInvestments(
          JSON.parse(localStorage.getItem(investmentStorageKey()) ?? "[]"),
        );
      }
    };
    loadInvestments();
  }, []);
  const refreshInvestments = async () => {
    try {
      const response = await fetch("/api/investments", {
        headers: authHeaders(),
      });
      if (response.ok) setSavedInvestments(await response.json());
    } catch {
      /* local fallback remains available */
    }
  };
  const editInvestment = (investment: SavedInvestment) => {
    setEditingInvestmentId(investment.id ?? null);
    setEditingLocalInvestment(investment.id ? null : investment);
    setActiveTab(investment.type);
    setInstitutionId(investment.institutionId);
    setProductId(investment.productId);
    setInvestmentName(investment.investmentName ?? "");
    setPlataPlus(investment.plataPlus ?? false);
    setReinvestmentRule(investment.reinvestmentRule ?? "capital_e_intereses");
    setFixedRate(
      String(investment.annualRate ?? 11),
    );
    setPromoCapInput(String(investment.promoCap ?? (investment.institutionId === "mifel" ? 500000 : 0)));
    setExcessRateInput(String(investment.excessRate ?? 0));
    setBalance(String(investment.balance));
    setWithdrawn(String(investment.withdrawn));
    setStartDate(investment.startDate);
    setEndDate(investment.endDate ?? dateValue(new Date()));
    setTermDays(String(investment.termDays ?? 30));
    setEtfName(
      investment.etfName ??
        (investment.type === "etf" ? investment.productId : ""),
    );
    setEtfTitles(String(investment.etfTitles ?? 0));
    setEtfPurchasePrice(String(investment.etfPurchasePrice ?? 0));
    setEtfCurrentValue(
      String(investment.etfCurrentValue ?? investment.balance ?? 0),
    );
    setEtfDividendRate(String(investment.etfDividendRate ?? 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteInvestment = async (investment: SavedInvestment) => {
    if (!window.confirm("¿Eliminar esta inversión?")) return;
    if (investment.id) {
      let response = await fetch(`/api/investments/${investment.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) {
        if (response.status === 404) {
          const local = JSON.parse(
            localStorage.getItem(investmentStorageKey()) ?? "[]",
          ).filter(
            (item: SavedInvestment) => !sameInvestment(item, investment),
          );
          localStorage.setItem(investmentStorageKey(), JSON.stringify(local));
          setSavedInvestments((current) =>
            current.filter((item) => item.id !== investment.id),
          );
          window.dispatchEvent(new Event("finanzia-investment-saved"));
          setSavedMessage(
            "Registro huérfano eliminado del listado; no existía en PostgreSQL.",
          );
          return;
        }
        const error = await response.json().catch(() => null);
        setSavedMessage(
          error?.error ?? `PostgreSQL respondió con error ${response.status}.`,
        );
        return;
      }
      setSavedInvestments((current) =>
        current.filter((item) => item.id !== investment.id),
      );
      window.dispatchEvent(new Event("finanzia-investment-saved"));
      setSavedMessage("Inversión eliminada correctamente.");
      return;
    } else {
      const local = JSON.parse(
        localStorage.getItem(investmentStorageKey()) ?? "[]",
      ).filter(
        (item: SavedInvestment) =>
          !(
            item.institutionId === investment.institutionId &&
            item.productId === investment.productId &&
            item.startDate === investment.startDate &&
            item.balance === investment.balance
          ),
      );
      localStorage.setItem(investmentStorageKey(), JSON.stringify(local));
      setSavedInvestments(local);
      window.dispatchEvent(new Event("finanzia-investment-saved"));
      return;
    }
  };
  const savedByActiveTab = savedInvestments.filter(
    (investment) => investment.type === activeTab,
  );
  const savedTotalPages = Math.max(
    1,
    Math.ceil(savedByActiveTab.length / savedPageSize),
  );
  const effectiveSavedPage = Math.min(savedPage, savedTotalPages);
  const paginatedSavedInvestments = savedByActiveTab.slice(
    (effectiveSavedPage - 1) * savedPageSize,
    effectiveSavedPage * savedPageSize,
  );
  const saveInvestment = async () => {
    if (!canSave) return;

    if (activeTab === "etf") {
      if (!etfName.trim()) {
        window.alert("Ingresa el nombre del ETF.");
        return;
      }
      if (Number(etfTitles) <= 0) {
        window.alert("La cantidad de títulos debe ser mayor a 0.");
        return;
      }
      if (currentEtfValue <= 0) {
        window.alert("El valor actual del ETF debe ser mayor a 0.");
        return;
      }
      if (totalWithdrawn < 0) {
        window.alert("El total retirado no puede ser negativo.");
        return;
      }
    } else {
      const validationErrors = validateInvestmentInput({
        type: activeTab,
        balance: currentBalance,
        withdrawn: totalWithdrawn,
        startDate,
      });

      if (validationErrors.length > 0) {
        window.alert(validationErrors[0]);
        return;
      }
    }

    if (activeTab !== "etf" && totalWithdrawn > currentBalance) {
      window.alert(
        `No puedes retirar más de $${currentBalance.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })}.`,
      );
      return;
    }

    setIsSaving(true);
    const investment = {
      type: activeTab,
      institutionId: activeTab === "etf" ? "etf" : institutionId,
      productId: activeTab === "etf" ? etfName.trim() : productId,
      investmentName: activeTab === "etf" ? undefined : investmentName.trim(),
      balance: activeTab === "etf" ? currentEtfValue : currentBalance,
      etfName: activeTab === "etf" ? etfName.trim() : undefined,
      etfTitles: activeTab === "etf" ? Number(etfTitles) : undefined,
      etfPurchasePrice:
        activeTab === "etf" ? Number(etfPurchasePrice) : undefined,
      etfCurrentValue: activeTab === "etf" ? currentEtfValue : undefined,
      etfDividendRate:
        activeTab === "etf" ? Number(etfDividendRate) : undefined,
      promoCap,
      annualRate,
      excessRate,
      monthlyYield,
      nextMonthBalance,
      nextMonthExcess: Math.max(0, nextMonthBalance - promoCap),
      withdrawn: totalWithdrawn,
      termDays: activeTab === "plazo" ? Number(termDays) : undefined,
      startDate,
      calculatedAt: dateValue(calculationDate),
      daysElapsed,
      endDate: activeTab === "plazo" ? endDate : undefined,
      estimatedToday,
      promotionalYield: isFlexibleUltra
        ? compoundInterest(
            promoBalance,
            plataPlus ? 15 : 7,
            Math.min(daysElapsed, 60),
          )
        : isMifel
          ? mifelInterest(promoBalance, annualRate, daysElapsed)
          : isOpenbank
            ? openbankInterest(
                promoBalance,
                annualRate,
                excessRate,
                daysElapsed,
              )
            : compoundInterest(promoBalance, annualRate, daysElapsed),
      excessYield: isFlexibleUltra
        ? compoundInterest(excessBalance, plataPlus ? 9 : 7, daysElapsed)
        : compoundInterest(excessBalance, excessRate, daysElapsed),
      dailyYield,
      taxWithheld,
      netDailyYield,
      updatedBalance,
      totalAccumulated,
      plataPlus: institutionId === "banco-plata" && plataPlus,
      reinvestmentRule,
      updatedAt: new Date().toISOString(),
    };
    try {
      const endpoint = editingInvestmentId
        ? `/api/investments/${editingInvestmentId}`
        : "/api/investments";
      const response = await fetch(endpoint, {
        method: editingInvestmentId ? "PUT" : "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(investment),
      });
      if (!response.ok) throw new Error("API unavailable");
      const savedInvestment = await response.json();
      const localInvestments = JSON.parse(
        localStorage.getItem(investmentStorageKey()) ?? "[]",
      );
      const localIndex = localInvestments.findIndex((item: SavedInvestment) =>
        savedInvestment.id
          ? item.id === savedInvestment.id
          : sameInvestment(item, investment),
      );
      if (localIndex >= 0) localInvestments[localIndex] = savedInvestment;
      else localInvestments.push(savedInvestment);
      localStorage.setItem(
        investmentStorageKey(),
        JSON.stringify(localInvestments),
      );
      setSavedMessage("Inversión guardada en PostgreSQL.");
      setEditingInvestmentId(null);
      setEditingLocalInvestment(null);
      await refreshInvestments();
      window.dispatchEvent(new Event("finanzia-investment-saved"));
    } catch {
      const investments = JSON.parse(
        localStorage.getItem(investmentStorageKey()) ?? "[]",
      );
      if (editingInvestmentId) {
        const index = investments.findIndex(
          (item: SavedInvestment) => item.id === editingInvestmentId,
        );
        if (index >= 0)
          investments[index] = { ...investment, id: editingInvestmentId };
        else investments.push({ ...investment, id: editingInvestmentId });
      } else if (editingLocalInvestment) {
        const index = investments.findIndex((item: SavedInvestment) =>
          sameInvestment(item, editingLocalInvestment),
        );
        if (index >= 0) investments[index] = investment;
        else investments.push(investment);
      } else investments.push(investment);
      localStorage.setItem(investmentStorageKey(), JSON.stringify(investments));
      setSavedInvestments(investments);
      setEditingLocalInvestment(null);
      setSavedMessage("PostgreSQL no está disponible; guardada localmente.");
      window.dispatchEvent(new Event("finanzia-investment-saved"));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="investment-page">
      <NavigationHeader pageLabel="Nueva inversión" />
      <main className="investment-content">
        <div className="investment-intro">
          <div>
            <span className="eyebrow orange">Registro de inversiones</span>
            <h1>Nueva inversión</h1>
            <p>
              Captura una inversión y relaciona la institución que la ofrece.
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
                if (id === "plazo") {
                  setInstitutionId("cetesdirecto");
                  setProductId("cetesdirecto-cetes");
                  setFixedRate("6.15");
                }
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        {activeTab === "vista" ||
        activeTab === "plazo" ||
        activeTab === "etf" ? (
          <section className="investment-form-panel">
            <div className="form-panel-heading">
              <div>
                <span className="eyebrow">Alta de inversión</span>
                <h2>
                  {activeTab === "plazo"
                    ? "Inversión a plazo"
                    : activeTab === "etf"
                      ? "Inversión ETF"
                      : "Inversión a la vista"}
                </h2>
              </div>
              <FilePlus2 size={24} />
            </div>
            {activeTab === "etf" ? (
              <div className="form-grid investment-fields vista-fields">
                <label>
                  ETF
                  <input
                    type="text"
                    placeholder="Ej. VOO o QQQ"
                    value={etfName}
                    onChange={(event) => setEtfName(event.target.value)}
                  />
                </label>
                <label>
                  Títulos
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={etfTitles}
                    onChange={(event) => setEtfTitles(event.target.value)}
                  />
                </label>
                <label>
                  Precio Compra Promedio
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={etfPurchasePrice}
                    onChange={(event) =>
                      setEtfPurchasePrice(event.target.value)
                    }
                  />
                </label>
                <label>
                  Valor actual
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={etfCurrentValue}
                    onChange={(event) => setEtfCurrentValue(event.target.value)}
                  />
                </label>
                <label>
                  Total retirado
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={withdrawn}
                    onChange={(event) => setWithdrawn(event.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className="form-grid investment-fields vista-fields">
                <label>
                  Nombre de la inversión
                  <input
                    type="text"
                    placeholder={
                      activeTab === "plazo"
                        ? "Ej. CETES 2026"
                        : "Ej. Fondo de emergencia"
                    }
                    value={investmentName}
                    onChange={(event) => setInvestmentName(event.target.value)}
                    maxLength={120}
                  />
                </label>
                <label>
                  Institución
                  <select
                    value={institutionId}
                    onChange={(event) => setInstitution(event.target.value)}
                  >
                    <option value="">Selecciona una institución</option>
                    {sortedInstitutions
                      .filter((institution) =>
                        isSelectableInstitution(institution.id, activeTab, institution.products),
                      )
                      .map((institution) => (
                        <option value={institution.id} key={institution.id}>
                          {institution.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {activeTab === "plazo" ? "Instrumento" : "Producto"}
                  <select
                    value={productId}
                    onChange={(event) => {
                      setProductId(event.target.value);
                      const nextProduct = productsWithRate.find(
                        (product) => product.id === event.target.value,
                      );
                      setFixedRate(
                        String(
                          defaultRateFor(institutionId, nextProduct),
                        ),
                      );
                      setPromoCapInput(String(nextProduct?.promoCap ?? 0));
                      setExcessRateInput(String(nextProduct?.excessRate ?? 0));
                      setSavedMessage("");
                    }}
                    disabled={!products.length}
                  >
                    <option value="">Selecciona un producto</option>
                    {productsWithRate.map((product) => (
                      <option value={product.id} key={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {activeTab === "plazo"
                    ? "Monto invertido"
                    : "Saldo invertido"}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={isMifel ? promoCap : undefined}
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                  />
                </label>
                <label>
                  Total retirado
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={withdrawn}
                    onChange={(event) => setWithdrawn(event.target.value)}
                  />
                </label>
                {activeTab === "plazo" && (
                  <label>
                    Plazo días
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={termDays}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTermDays(value);
                      }}
                    />
                  </label>
                )}
                {activeTab === "vista" && (
                  <label>
                    Tope Promo
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={promoCapInput}
                      onChange={(event) => setPromoCapInput(event.target.value)}
                    />
                  </label>
                )}
                <label>
                  {activeTab === "plazo" ? "Tasa" : "Tasa Anual"}
                  {selectedProduct ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fixedRate}
                      onChange={(event) => setFixedRate(event.target.value)}
                    />
                  ) : (
                    <input
                      readOnly
                      value={
                        annualRate
                          ? `${percent.format(annualRate)}%`
                          : "Selecciona producto"
                      }
                    />
                  )}
                </label>
                {activeTab === "vista" && (
                  <label>
                    Tasa excedente
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={excessRateInput}
                      onChange={(event) =>
                        setExcessRateInput(event.target.value)
                      }
                    />
                  </label>
                )}
                <div className="form-inline-fields">
                  <label>
                    {activeTab === "plazo" ? "Fecha Inversión" : "Fecha Inicio"}
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStartDate(value);
                      }}
                    />
                  </label>
                  {(isKubo || activeTab === "plazo") && (
                    <label>
                      Fecha Vencimiento
                      <input
                        type="date"
                        min={startDate}
                        value={endDate}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEndDate(value);
                        }}
                      />
                    </label>
                  )}
                </div>
                {activeTab === "plazo" && (
                  <label>
                    Regla de reinversión
                    <select
                      value={reinvestmentRule}
                      onChange={(event) => setReinvestmentRule(event.target.value as "no" | "capital" | "capital_e_intereses")}
                    >
                      <option value="no">No reinvertir</option>
                      <option value="capital">Reinvertir solo capital</option>
                      <option value="capital_e_intereses">Reinvertir capital e intereses</option>
                    </select>
                  </label>
                )}
              </div>
            )}
            {institutionSimulatorVisible && (
              <div className="simulator-toggle-row">
                <button
                  type="button"
                  className="secondary-button simulator-toggle"
                  onClick={() => setSimulatorOpen((current) => !current)}
                >
                  <span className="simulator-badge">{institutionSimulatorIcon}</span>
                  {simulatorOpen ? `Ocultar simulador` : `Simulador • ${institutionNameForSimulator}`}
                </button>
              </div>
            )}
            {institutionSimulatorVisible && simulatorOpen && institutionSimulator && (
              <div className="cetes-calculator-panel">
                <div className="cetes-calculator-header">
                  <div>
                    <span className="eyebrow orange">Simulador</span>
                    <h3>{institutionSimulator.title}</h3>
                  </div>
                  <span className="cetes-pill">{institutionSimulator.title}</span>
                </div>
                <p className="simulator-subtitle">{institutionSimulatorSubtitle}</p>

                <div className="cetes-calculator-grid">
                  <label className="cetes-field">
                    <span>Monto inicial</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={balance}
                      onChange={(event) => setBalance(event.target.value)}
                    />
                  </label>

                  <label className="cetes-field">
                    <span>Tasa anual</span>
                    <div className="cetes-input-with-suffix">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fixedRate}
                        onChange={(event) => setFixedRate(event.target.value)}
                      />
                      <em>%</em>
                    </div>
                  </label>

                  <label className="cetes-field">
                    <span>{activeTab === "vista" ? "Días a proyectar" : "Plazo en días"}</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={termDays}
                      onChange={(event) => setTermDays(event.target.value)}
                    />
                  </label>
                </div>

                {(institutionCalculatorType === "banco-plata" ||
                  (institutionCalculatorType === "generic" && ((selectedProduct?.promoCap || 0) > 0 || Number(promoCapInput) > 0))) && (
                  <div className="cetes-calculator-grid extra-simulator-row">
                    <label className="cetes-field">
                      <span>Tope promocional</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={promoCapInput}
                        onChange={(event) => setPromoCapInput(event.target.value)}
                      />
                    </label>
                  </div>
                )}

                {institutionCalculatorType === "kubo" && (
                  <div className="simulator-hint">
                    Retención estimada: 7.7% anual aplicada al rendimiento.
                  </div>
                )}

                <div className="cetes-results-grid">
                  {institutionCalculatorType === "kubo" ? (
                    <>
                      <div className="cetes-result-card">
                        <small>Ganancia del ciclo</small>
                        <strong>{money.format((institutionSimulator.finalAmount ?? 0) - (Number(balance) || 0))}</strong>
                      </div>
                      <div className="cetes-result-card">
                        <small>Siguiente reinversión</small>
                        <strong>{money.format((institutionSimulator.nextCycleAmount ?? institutionSimulator.finalAmount) - (institutionSimulator.finalAmount ?? 0))}</strong>
                      </div>
                      <div className="cetes-result-card">
                        <small>Proyección anual</small>
                        <strong>{money.format(institutionSimulator.annualGain)}</strong>
                      </div>
                      <div className="cetes-result-card">
                        <small>Saldo estimado</small>
                        <strong>{money.format(institutionSimulator.nextCycleAmount ?? institutionSimulator.finalAmount)}</strong>
                      </div>
                      <div className="cetes-result-card cetes-result-accent">
                        <small>Monto al vencimiento</small>
                        <strong>{money.format(institutionSimulator.finalAmount)}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="cetes-result-card">
                        <small>Ganancia diaria</small>
                        <strong>{money.format(institutionSimulator.dailyGain)}</strong>
                      </div>
                      <div className="cetes-result-card">
                        <small>Ganancia semanal</small>
                        <strong>{money.format(institutionSimulator.weeklyGain)}</strong>
                      </div>
                      <div className="cetes-result-card">
                        <small>Ganancia mensual</small>
                        <strong>{money.format(institutionSimulator.monthlyGain)}</strong>
                      </div>
                      <div className="cetes-result-card">
                        <small>Ganancia anual</small>
                        <strong>{money.format(institutionSimulator.annualGain)}</strong>
                      </div>
                      <div className="cetes-result-card cetes-result-accent">
                        <small>{activeTab === "vista" ? "Saldo proyectado" : "Monto al vencimiento"}</small>
                        <strong>{money.format(institutionSimulator.finalAmount)}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {activeTab !== "etf" && (
              <div className="calculation-note">
                <strong>
                  {isMifel
                    ? `El saldo máximo de este producto es ${money.format(promoCap)}.`
                    : institutionId === "mercado-pago"
                      ? "Tasa anual fija del 12%."
                      : `Excedente calculado al ${excessRate}% anual.`}
                </strong>
                <span>
                  {isMifel
                    ? "Los rendimientos y el ISR se calculan diariamente; si el día cae en fin de semana, el registro se refleja en el siguiente día hábil."
                    : institutionId === "mercado-pago"
                      ? "Este producto se calcula con una sola regla: 12% anual fijo y sin compra mensual ni tope promocional."
                      : "La promoción se aplica hasta el tope definido por el producto seleccionado."}
                </span>
              </div>
            )}
            {exceedsMifelLimit && (
              <p className="save-message">
                Reduce el saldo a {money.format(promoCap)} o menos para guardar
                esta inversión Mifel.
              </p>
            )}
            {savedMessage && <p className="save-message">{savedMessage}</p>}
            <button
              className="primary-button"
              disabled={!canSave || isSaving}
              onClick={saveInvestment}
            >
              {isSaving ? "Guardando..." : "Guardar inversión"}
            </button>
          </section>
        ) : (
          <section className="investment-form-panel pending-investment">
            <div className="form-panel-heading">
              <div>
                <span className="eyebrow">Alta de inversión</span>
                <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              </div>
              <FilePlus2 size={24} />
            </div>
            <p>
              Los campos de esta inversión quedarán pendientes hasta recibir el
              ejemplo correspondiente.
            </p>
            <button className="primary-button" disabled>
              Guardar inversión
            </button>
          </section>
        )}
        <section className="saved-investments-section">
          <div className="saved-investments-heading">
            <div>
              <span className="eyebrow">Registros existentes</span>
              <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
            </div>
            <span className="saved-count">{savedByActiveTab.length}</span>
          </div>
          {savedByActiveTab.length ? (
            <>
              <div className="saved-investments-list">
                {paginatedSavedInvestments.map((investment, index) => (
                  <article
                    className="saved-investment-row"
                    key={`${investment.id ?? "local"}-${index}`}
                  >
                    <div>
                      <strong>
                        {investment.type === "etf"
                          ? "ETF"
                          : (investment.investmentName ??
                            institutions.find(
                              (item) => item.id === investment.institutionId,
                            )?.name ??
                            "Institución eliminada")}
                      </strong>
                      <span>
                        {investment.type === "etf"
                          ? (investment.etfName ?? investment.productId)
                          : (institutions.find(
                              (item) => item.id === investment.institutionId,
                            )?.name ?? "Institución eliminada")}
                      </span>
                    </div>
                    <div>
                      <small>
                        {investment.type === "etf"
                          ? "Valor actual"
                          : "Saldo actualizado"}
                      </small>
                      <b>
                        {money.format(
                          investment.type === "etf"
                            ? (investment.etfCurrentValue ?? 0)
                            : (investment.updatedBalance ?? investment.balance),
                        )}
                      </b>
                    </div>
                    <div>
                      <small>Rendimiento acumulado</small>
                      <b>{money.format(investment.totalAccumulated ?? 0)}</b>
                    </div>
                    <div className="saved-row-actions">
                      <button
                        className="secondary-button"
                        onClick={() => editInvestment(investment)}
                      >
                        Editar
                      </button>
                      <button
                        className="danger-button"
                        onClick={() => deleteInvestment(investment)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="saved-pagination">
                <label>
                  Registros por página
                  <select
                    value={savedPageSize}
                    onChange={(event) => {
                      setSavedPageSize(Number(event.target.value));
                      setSavedPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                  </select>
                </label>
                <span>
                  Página {effectiveSavedPage} de {savedTotalPages}
                </span>
                <div className="saved-pagination-actions">
                  <button
                    className="secondary-button"
                    disabled={effectiveSavedPage <= 1}
                    onClick={() =>
                      setSavedPage((page) => Math.max(1, page - 1))
                    }
                  >
                    Anterior
                  </button>
                  <button
                    className="secondary-button"
                    disabled={effectiveSavedPage >= savedTotalPages}
                    onClick={() =>
                      setSavedPage((page) =>
                        Math.min(savedTotalPages, page + 1),
                      )
                    }
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="saved-empty">
              Las inversiones guardadas aparecerán aquí.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
