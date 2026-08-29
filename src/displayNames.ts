export const humanizeIdentifier = (value: string | null | undefined, fallback = 'Sin nombre') => {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  const formatted = trimmed
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  return formatted ? formatted.replace(/\b\w/g, (letter) => letter.toUpperCase()) : fallback;
};

export const formatInstitutionName = (institutionId: string, name?: string | null) =>
  name?.trim() || humanizeIdentifier(institutionId, 'Institución sin nombre');

export const formatProductName = (productId: string, name?: string | null) =>
  name?.trim() || humanizeIdentifier(productId, 'Producto sin nombre');
