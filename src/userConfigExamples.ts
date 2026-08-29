export type UserProductConfigExample = {
  institutionId: string;
  productId: string;
  annualRate: number;
  promoCap: number;
  excessRate: number;
  calculationMethod: "compound" | "simple" | "simple360" | "flexible" | "openbank" | "mifel360" | "kubo";
  taxRate: number;
  daysBase: number;
  promotionDays: number;
  isActive: boolean;
};

export const userConfigExamples: UserProductConfigExample[] = [
  {
    institutionId: "mifel",
    productId: "mifel-cuenta-digital-evoluciona",
    annualRate: 10,
    promoCap: 500000,
    excessRate: 0,
    calculationMethod: "mifel360",
    taxRate: 9,
    daysBase: 360,
    promotionDays: 60,
    isActive: true,
  },
  {
    institutionId: "openbank",
    productId: "openbank-13",
    annualRate: 13,
    promoCap: 30000,
    excessRate: 7,
    calculationMethod: "openbank",
    taxRate: 0,
    daysBase: 360,
    promotionDays: 60,
    isActive: true,
  },
  {
    institutionId: "nu",
    productId: "nu-cuenta",
    annualRate: 13,
    promoCap: 25000,
    excessRate: 0,
    calculationMethod: "compound",
    taxRate: 0,
    daysBase: 365,
    promotionDays: 60,
    isActive: true,
  },
  {
    institutionId: "didi-cuenta",
    productId: "didi-cuenta",
    annualRate: 15,
    promoCap: 10000,
    excessRate: 7.5,
    calculationMethod: "compound",
    taxRate: 0,
    daysBase: 365,
    promotionDays: 60,
    isActive: true,
  },
  {
    institutionId: "kubo",
    productId: "kubo-liquidez",
    annualRate: 13,
    promoCap: 0,
    excessRate: 0,
    calculationMethod: "kubo",
    taxRate: 0,
    daysBase: 365,
    promotionDays: 60,
    isActive: true,
  },
  {
    institutionId: "kubo",
    productId: "kubo-plazos",
    annualRate: 7.5,
    promoCap: 0,
    excessRate: 0,
    calculationMethod: "kubo",
    taxRate: 0,
    daysBase: 365,
    promotionDays: 60,
    isActive: true,
  },
  {
    institutionId: "kubo",
    productId: "kubo-largo-plazo",
    annualRate: 12,
    promoCap: 0,
    excessRate: 0,
    calculationMethod: "kubo",
    taxRate: 0,
    daysBase: 365,
    promotionDays: 60,
    isActive: true,
  },
];
