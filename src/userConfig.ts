export type CalculationMethod =
  | "compound"
  | "simple"
  | "simple360"
  | "flexible"
  | "openbank"
  | "mifel360"
  | "kubo";

export type UserProductConfig = {
  institutionId: string;
  productId: string;
  annualRate: number;
  promoCap: number;
  excessRate: number;
  calculationMethod: CalculationMethod;
  taxRate: number;
  daysBase: number;
  promotionDays: number;
  isActive: boolean;
  updatedAt: string;
};

export type UserProductConfigInput = Partial<UserProductConfig> & {
  institutionId: string;
  productId: string;
};

export const defaultUserProductConfig = (): Omit<UserProductConfig, "institutionId" | "productId" | "updatedAt"> => ({
  annualRate: 0,
  promoCap: 0,
  excessRate: 0,
  calculationMethod: "compound",
  taxRate: 0,
  daysBase: 365,
  promotionDays: 60,
  isActive: true,
});

export const canonicalizeUserProduct = (institutionId: string, productId: string) => {
  const normalizedInstitutionId = String(institutionId ?? "").trim();
  const normalizedProductId = String(productId ?? "").trim();

  if (normalizedInstitutionId === "kubo") {
    return normalizedProductId === "kubo-plazos" || normalizedProductId === "kubo-largo-plazo"
      ? "kubo-liquidez"
      : normalizedProductId;
  }

  return normalizedProductId;
};

export const normalizeUserProductConfig = (input: UserProductConfigInput): UserProductConfig => {
  const defaults = defaultUserProductConfig();
  const safeNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const institutionId = String(input.institutionId || "").trim();
  const productId = canonicalizeUserProduct(institutionId, String(input.productId || "").trim());

  return {
    institutionId,
    productId,
    annualRate: safeNumber(input.annualRate, defaults.annualRate),
    promoCap: Math.max(0, safeNumber(input.promoCap, defaults.promoCap)),
    excessRate: Math.max(0, safeNumber(input.excessRate, defaults.excessRate)),
    calculationMethod: (input.calculationMethod as CalculationMethod) || defaults.calculationMethod,
    taxRate: Math.max(0, safeNumber(input.taxRate, defaults.taxRate)),
    daysBase: Math.max(1, safeNumber(input.daysBase, defaults.daysBase)),
    promotionDays: Math.max(0, safeNumber(input.promotionDays, defaults.promotionDays)),
    isActive: input.isActive ?? defaults.isActive,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
};

export const createUserProductConfig = (
  input: UserProductConfigInput & {
    annualRate?: number;
    promoCap?: number;
    calculationMethod?: CalculationMethod;
    taxRate?: number;
    daysBase?: number;
  },
): UserProductConfig =>
  normalizeUserProductConfig({
    ...input,
    annualRate: input.annualRate ?? defaultUserProductConfig().annualRate,
    promoCap: input.promoCap ?? defaultUserProductConfig().promoCap,
    excessRate: input.excessRate ?? defaultUserProductConfig().excessRate,
    calculationMethod: input.calculationMethod ?? defaultUserProductConfig().calculationMethod,
    taxRate: input.taxRate ?? defaultUserProductConfig().taxRate,
    daysBase: input.daysBase ?? defaultUserProductConfig().daysBase,
    promotionDays: input.promotionDays ?? defaultUserProductConfig().promotionDays,
    isActive: input.isActive ?? defaultUserProductConfig().isActive,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });

export const notifyUserConfigUpdated = () => {
  const event = new Event("finanzia-user-config-updated");
  if (typeof window !== "undefined" && "dispatchEvent" in window) {
    window.dispatchEvent(event);
    return;
  }
  if (typeof globalThis !== "undefined" && "dispatchEvent" in globalThis) {
    globalThis.dispatchEvent(event);
  }
};

export const mergeUserProductConfig = <
  TInstitution extends { id: string; products: Array<Record<string, unknown>> },
>(
  institutions: TInstitution[],
  userConfigs: UserProductConfig[] = [],
): TInstitution[] => {
  const overrides = new Map<string, UserProductConfig>();

  for (const config of userConfigs) {
    const normalized = normalizeUserProductConfig(config);
    const key = `${normalized.institutionId}::${normalized.productId}`;
    overrides.set(key, normalized);
  }

  return institutions.map((institution) => {
    const products = institution.products
      .filter((product) => {
        const canonical = canonicalizeUserProduct(String(institution.id ?? ""), String(product.id ?? ""));
        return canonical === String(product.id ?? "");
      })
      .map((product) => {
        const overrideKey = `${institution.id}::${canonicalizeUserProduct(String(institution.id ?? ""), String(product.id ?? ""))}`;
        const override = overrides.get(overrideKey);
        if (!override) return product;

        const { institutionId: _institutionId, productId: _productId, updatedAt: _updatedAt, ...rest } = override;
        return {
          ...product,
          ...rest,
        } as typeof product;
      });

    return {
      ...institution,
      products,
    } as TInstitution;
  });
};
