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
  if (institutionId === "didi-cuenta" && product.id === "didi-cuenta") return tab === "vista";
  if (institutionId === "mifel" && product.id === "mifel-cuenta-digital") return tab === "vista";
  if (institutionId === "nu" && product.id === "nu-cajita-turbo") return tab === "vista";
  if (institutionId === "openbank" && product.id === "openbank") return tab === "vista";
  if (institutionId === "mercado-pago" && product.id === "mercado-pago") return tab === "vista";
  if (institutionId === "kubo" && product.id === "kubo-liquidez") return tab === "plazo";
  if (institutionId === "banco-plata" && ["ahorro-flexible", "ahorro-fijo"].includes(product.id)) {
    return tab === "plazo";
  }
  if (institutionId === "cetesdirecto" && ["cetesdirecto-cetes", "cetesdirecto-bonos", "cetesdirecto-bonddia", "cetesdirecto-udibonos"].includes(product.id)) {
    return tab === "plazo";
  }

  // Custom products or newly added products to any institution:
  const isFixed = product.icon === "fixed" || product.calculationMethod === "simple" || product.calculationMethod === "simple360";
  if (tab === "plazo") {
    return isFixed;
  }
  if (tab === "vista") {
    return !isFixed;
  }

  return true;
};

export const isSelectableInstitution = (
  institutionId: string,
  tab: Tab = "vista",
  products: RateProduct[] = [],
) => {
  if (products && products.length > 0) {
    return products.some((product) => isSelectableProduct(institutionId, product, tab));
  }

  if (institutionId === "banco-plata") return tab === "plazo";
  if (institutionId === "cetesdirecto") return tab === "plazo";
  if (institutionId === "kubo") return tab === "plazo";
  if (institutionId === "nu" || institutionId === "mercado-pago" || institutionId === "openbank" || institutionId === "didi-cuenta" || institutionId === "mifel") {
    return tab === "vista";
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
