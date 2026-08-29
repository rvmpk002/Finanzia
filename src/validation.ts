export type InstitutionValidationInput = {
  name?: string;
  website?: string;
};

export type InvestmentValidationInput = {
  type?: string;
  balance?: number | string;
  withdrawn?: number | string;
  startDate?: string;
};

const isValidUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateInstitutionInput = (input: InstitutionValidationInput) => {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push('El nombre de la institución es obligatorio.');
  }

  if (input.website && !isValidUrl(input.website)) {
    errors.push('La URL del sitio web es inválida.');
  }

  return errors;
};

export const validateInvestmentInput = (input: InvestmentValidationInput) => {
  const errors: string[] = [];
  const balance = Number(input.balance ?? 0);
  const withdrawn = Number(input.withdrawn ?? 0);
  const startDate = input.startDate ? new Date(`${input.startDate}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (balance <= 0) {
    errors.push('El saldo inicial debe ser mayor a 0.');
  }

  if (withdrawn < 0) {
    errors.push('El monto retirado no puede ser negativo.');
  }

  if (input.startDate && startDate && Number.isFinite(startDate.getTime())) {
    if (startDate > today) {
      errors.push('La fecha de inicio no puede ser futura.');
    }

    if (startDate < new Date('1900-01-01T00:00:00')) {
      errors.push('La fecha de inicio es demasiado antigua.');
    }
  }

  return errors;
};
