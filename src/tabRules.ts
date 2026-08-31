export type Tab = "vista" | "plazo" | "etf";

export type RateProduct = {
  id: string;
  name: string;
  promoCap?: number;
  annualRate?: number;
  excessRate?: number;
  icon?: "account" | "flexible" | "fixed";
  calculationMethod?: string;
};

export const isSelectableProduct = (
  institutionId: string,
  product: RateProduct,
  tab: Tab = "vista",
) => {
  if (institutionId === "didi-cuenta") return tab === "vista" && product.id === "didi-cuenta";
  if (institutionId === "mifel") return tab === "vista" && product.id === "mifel-cuenta-digital";
  if (institutionId === "nu") return tab === "vista" && product.id === "nu-cajita-turbo";
  if (institutionId === "openbank") return tab === "vista" && product.id === "openbank";
  if (institutionId === "mercado-pago") return tab === "vista" && product.id === "mercado-pago";
  if (institutionId === "kubo") return tab === "plazo" && product.id === "kubo-liquidez";
  if (institutionId === "banco-plata") {
    return tab === "plazo" && ["ahorro-flexible", "ahorro-fijo"].includes(product.id);
  }
  if (institutionId === "cetesdirecto") {
    return tab === "plazo" && ["cetesdirecto-cetes", "cetesdirecto-bonos", "cetesdirecto-bonddia", "cetesdirecto-udibonos"].includes(product.id);
  }

  // Custom products:
  const isFixed = product.icon === "fixed" || product.calculationMethod === "simple" || product.calculationMethod === "simple360";
  if (tab === "plazo") {
    return isFixed;
  }
  if (tab === "vista") {
    return !isFixed;
  }

  return true;
};

export const isSelectableInstitution = (institutionId: string, tab: Tab = "vista", products: RateProduct[] = []) => {
  if (institutionId === "banco-plata") return tab === "plazo";
  if (institutionId === "cetesdirecto") return tab === "plazo";
  if (institutionId === "kubo") return tab === "plazo";
  if (institutionId === "nu" || institutionId === "mercado-pago" || institutionId === "openbank" || institutionId === "didi-cuenta" || institutionId === "mifel") {
    return tab === "vista";
  }

  // For custom institutions:
  if (products && products.length > 0) {
    return products.some((product) => isSelectableProduct(institutionId, product, tab));
  }

  return true;
};

export const normalizeInvestmentType = (
  institutionId: string,
  currentType: Tab | "" | string = "vista",
): Tab => {
  if (institutionId === "kubo") return "plazo";
  return (currentType === "vista" || currentType === "plazo" || currentType === "etf")
    ? currentType
    : "vista";
};

export const getInvestmentTab = (institutionId: string, currentTab: Tab = "vista") => {
  return normalizeInvestmentType(institutionId, currentTab);
};
