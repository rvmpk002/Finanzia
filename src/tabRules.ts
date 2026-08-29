export type Tab = "vista" | "plazo" | "etf";

export type RateProduct = {
  id: string;
  name: string;
  promoCap?: number;
  annualRate?: number;
  excessRate?: number;
};

export const isSelectableProduct = (
  institutionId: string,
  product: RateProduct,
  tab: Tab = "vista",
) => {
  if (institutionId !== "didi-cuenta" && institutionId !== "kubo" && institutionId !== "mifel" && institutionId !== "nu" && institutionId !== "openbank" && institutionId !== "banco-plata") {
    return tab !== "plazo" || ["cetesdirecto-cetes", "cetesdirecto-udibonos", "ahorro-fijo"].includes(product.id);
  }

  if (institutionId === "didi-cuenta") return product.id === "didi-cuenta";
  if (institutionId === "mifel") return product.id === "mifel-cuenta-digital";
  if (institutionId === "nu") return product.id === "nu-cajita-turbo";
  if (institutionId === "openbank") return product.id === "openbank";

  if (institutionId === "kubo") {
    return tab === "plazo" && product.id === "kubo-liquidez";
  }

  if (institutionId === "banco-plata") {
    if (!["ahorro-flexible", "ahorro-fijo"].includes(product.id)) return false;
    return tab === "plazo";
  }

  return true;
};

export const isSelectableInstitution = (institutionId: string, tab: Tab = "vista") => {
  if (institutionId === "banco-plata") return tab === "plazo";
  if (institutionId === "cetesdirecto") return tab !== "vista";
  if (institutionId === "kubo") return tab === "plazo";
  if (tab === "plazo") return ["cetesdirecto"].includes(institutionId);
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
