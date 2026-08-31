const validInstitutionProducts = {
  'banco-plata': ['ahorro-flexible', 'ahorro-fijo'],
  openbank: ['openbank'],
  nu: ['nu-cajita-turbo'],
  'didi-cuenta': ['didi-cuenta'],
  mifel: ['mifel-cuenta-digital'],
  kubo: ['kubo-liquidez'],
  'mercado-pago': ['mercado-pago'],
  etf: [],
  cetesdirecto: ['cetesdirecto-cetes', 'cetesdirecto-bonos', 'cetesdirecto-bonddia', 'cetesdirecto-udibonos'],
  'cetesdirecto': ['cetesdirecto-cetes', 'cetesdirecto-bonos', 'cetesdirecto-bonddia', 'cetesdirecto-udibonos'],
};

const legacyDidiProductIds = new Set(['didi-15', 'didi-7', 'didi-beneficios']);
const legacyMifelProductIds = new Set(['mifel-cuenta-digital-evoluciona']);
const legacyNuProductIds = new Set(['nu-cuenta', 'nu-cajita', 'nu-cajita-congelada']);
const legacyOpenbankProductIds = new Set(['openbank-13', 'openbank-7', 'openbank-6-5']);
const legacyMercadoPagoProductIds = new Set(['mercado-pago-12', 'mercado-pago-6']);

const canonicalizeProductId = (institutionId, productId) => {
  const normalized = String(productId ?? '');
  if (institutionId === 'didi-cuenta' && legacyDidiProductIds.has(normalized)) return 'didi-cuenta';
  if (institutionId === 'mifel' && legacyMifelProductIds.has(normalized)) return 'mifel-cuenta-digital';
  if (institutionId === 'nu' && legacyNuProductIds.has(normalized)) return 'nu-cajita-turbo';
  if (institutionId === 'openbank' && legacyOpenbankProductIds.has(normalized)) return 'openbank';
  if (institutionId === 'mercado-pago' && legacyMercadoPagoProductIds.has(normalized)) return 'mercado-pago';
  return normalized;
};

const normalizeInvestmentType = (institutionId, type) => {
  if (String(institutionId ?? '').trim() === 'kubo') return 'plazo';
  return ['vista', 'plazo', 'etf'].includes(String(type ?? '')) ? String(type) : 'vista';
};

const isValidInstitutionProduct = (institutionId, productId) => {
  const normalizedInstitutionId = String(institutionId ?? '').trim();
  const normalizedProductId = String(productId ?? '').trim();
  if (!normalizedInstitutionId || !normalizedProductId) return false;
  if (normalizedInstitutionId === 'etf') return true;
  if (validInstitutionProducts[normalizedInstitutionId]) {
    return validInstitutionProducts[normalizedInstitutionId].includes(normalizedProductId);
  }
  return true;
};

const sanitizeInstitutionProduct = (institutionId, productId) => {
  const normalizedInstitutionId = String(institutionId ?? '').trim();
  const normalizedProductId = canonicalizeProductId(normalizedInstitutionId, productId);
  if (!normalizedInstitutionId || !normalizedProductId || !isValidInstitutionProduct(normalizedInstitutionId, normalizedProductId)) {
    return { institutionId: normalizedInstitutionId, productId: normalizedProductId, isValid: false };
  }
  return { institutionId: normalizedInstitutionId, productId: normalizedProductId, isValid: true };
};

export {
  validInstitutionProducts,
  normalizeInvestmentType,
  sanitizeInstitutionProduct,
};
