export const BANCO_PLATA_PRODUCT_IDS = ['ahorro-flexible', 'ahorro-fijo'] as const;

export const BANCO_PLATA_CANONICAL_RULES = {
  'ahorro-flexible': {
    id: 'ahorro-flexible',
    name: 'Ahorro Flexible',
    badge: 'Ultra',
    annualRate: 15,
    promoCap: 25000,
    promos: ['15% anual en los primeros $25,000'],
    calculationMethod: 'flexible',
    promotionDays: 60,
  },
  'ahorro-fijo': {
    id: 'ahorro-fijo',
    name: 'Ahorro Fijo',
    annualRate: 11,
    calculationMethod: 'simple360',
    daysBase: 360,
    promos: ['11% anual fijo'],
  },
} as const;

export const isBancoPlataProduct = (productId: string) =>
  BANCO_PLATA_PRODUCT_IDS.includes(productId as (typeof BANCO_PLATA_PRODUCT_IDS)[number]);
