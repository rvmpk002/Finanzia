import { useEffect, useState } from "react";
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
};
type Institution = { id: string; name: string; products: RateProduct[] };
type Tab = "vista" | "plazo" | "etf";
const isSelectableProduct = (
  institutionId: string,
  product: RateProduct,
  tab: Tab = "vista",
) =>
  (institutionId !== "didi-cuenta" || product.id === "didi-cuenta") &&
  (institutionId !== "kubo" ||
    (tab === "plazo"
      ? product.id !== "kubo-liquidez"
      : product.id === "kubo-liquidez")) &&
  (institutionId !== "openbank" || product.id === "openbank-13") &&
  (tab !== "plazo" ||
    ["cetesdirecto-cetes", "cetesdirecto-udibonos", "ahorro-fijo"].includes(
      product.id,
    )) &&
  !(
    institutionId === "banco-plata" &&
    product.id === "ahorro-fijo" &&
    tab !== "plazo"
  );
const isSelectableInstitution = (institutionId: string, tab: Tab = "vista") =>
  tab === "plazo"
    ? ["cetesdirecto", "banco-plata", "kubo"].includes(institutionId)
    : institutionId !== "cetesdirecto";
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
  return (
    ((firstTier * annualRate) / 100 +
      ((secondTier + thirdTier) * excessRate) / 100) *
    (days / 360)
  );
};
const openbankPostingDays = (date: Date) => {
  const day = date.getDay();
  if (day === 0) return 0;
  if (day === 1) return 3;
  return 1;
};
const kuboInterest = (principal: number, annualRate: number, days: number) =>
  principal * (Math.pow(1 + annualRate / 100, days / 365) - 1);
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
  plataPlus: boolean,
) => {
  if (institutionId !== "banco-plata" || !product)
    return product?.annualRate ?? 0;
  if (product.id === "plata-cuenta") return plataPlus ? 7 : 0;
  if (product.id === "ahorro-flexible") return plataPlus ? 15 : 7;
  return plataPlus ? 9 : 7;
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
  const isNu = institutionId === "nu";
  const isOpenbank = institutionId === "openbank";
  const promoCap = Math.max(0, Number(promoCapInput) || 0);
  const annualRate = selectedProduct ? Number(fixedRate) : 0;
  const excessRate = Math.max(0, Number(excessRateInput) || 0);
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
  const openbankPostingDaysForDate = isOpenbank
    ? openbankPostingDays(calculationDate)
    : 0;
  const dailyYield = isFlexibleUltra
    ? flexibleUltraInterest(
        availableBalance,
        promoCap,
        1,
        annualRate,
        excessRate,
      )
    : isKubo
      ? kuboInterest(availableBalance, annualRate, 1)
      : isMifel
        ? mifelInterest(availableBalance, annualRate, 1)
        : isOpenbank
          ? openbankInterest(
              availableBalance,
              annualRate,
              excessRate,
              openbankPostingDaysForDate,
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
      : isOpenbank
        ? openbankInterest(availableBalance, annualRate, excessRate, monthlyDays)
        : officialMonthlyInterest(promoBalance, annualRate, monthlyDays) +
          officialMonthlyInterest(excessBalance, excessRate, monthlyDays);
  const totalAccumulated = Math.max(
    0,
    activeTab === "plazo"
      ? simpleInterest(availableBalance, annualRate, daysElapsed)
      : isDidi || isNu
        ? compoundInterest(promoBalance, annualRate, daysElapsed) +
          compoundInterest(excessBalance, excessRate, daysElapsed)
        : isKubo
          ? kuboInterest(availableBalance, annualRate, daysElapsed)
          : isMifel
            ? mifelInterest(availableBalance, annualRate, daysElapsed)
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
      (isDidi || isKubo || isNu || isOpenbank || isMifel
        ? totalAccumulated
        : monthlyYield * completedMonths) -
      0,
  );
  const nextMonthBalance = Math.max(
    0,
    availableBalance + (isKubo ? totalAccumulated : monthlyYield),
  );
  const estimatedToday = Math.max(0, availableBalance + dailyYield);
  const taxWithheld = isMifel
    ? dailyYield * 0.09
    : isNu
      ? dailyYield * 0.009
      : 0;
  const netDailyYield = dailyYield - taxWithheld;
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
    const nextProduct = institutions
      .find((item) => item.id === value)
      ?.products.find((product) =>
        isSelectableProduct(value, product, activeTab),
      );
    setProductId(nextProduct?.id ?? "");
    setFixedRate(String(defaultRateFor(value, nextProduct, plataPlus)));
    setPromoCapInput(String(nextProduct?.promoCap ?? 0));
    setExcessRateInput(String(nextProduct?.excessRate ?? 0));
    setSavedMessage("");
  };
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
    setFixedRate(
      String(investment.annualRate ?? (investment.plataPlus ? 9 : 7)),
    );
    setPromoCapInput(String(investment.promoCap ?? 0));
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
                        isSelectableInstitution(institution.id, activeTab),
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
                          defaultRateFor(institutionId, nextProduct, plataPlus),
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
              </div>
            )}
            {activeTab !== "etf" && (
              <div className="calculation-note">
                <strong>
                  {isMifel
                    ? `El saldo máximo de este producto es ${money.format(promoCap)}.`
                    : `Excedente calculado al ${excessRate}% anual.`}
                </strong>
                <span>
                  {isMifel
                    ? "Los rendimientos aplican únicamente sobre el saldo dentro del tope."
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
