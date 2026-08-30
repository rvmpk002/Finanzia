export const compoundInterest = (principal: number, annualRate: number, days: number) =>
  principal * (Math.pow(1 + annualRate / 100 / 365, days) - 1);

export const resolveRateSplit = (
  availableBalance: number,
  annualRate: number,
  promoCap: number,
  excessRate: number,
) => {
  const hasPromoCap = promoCap > 0;
  const hasExcessRate = excessRate > 0;
  if (!hasPromoCap && !hasExcessRate && annualRate > 0) {
    return {
      promoBalance: availableBalance,
      excessBalance: 0,
      effectiveExcessRate: annualRate,
    };
  }

  return {
    promoBalance: Math.min(availableBalance, promoCap),
    excessBalance: Math.max(0, availableBalance - promoCap),
    effectiveExcessRate: excessRate,
  };
};

export const simpleInterest = (
  principal: number,
  annualRate: number,
  days: number,
  daysBase = 365,
) =>
  principal * (annualRate / 100) * (days / daysBase);

export const bancoPlataInterest = (principal: number, annualRate: number, days: number) =>
  principal * (annualRate / 100) * (days / 360);

export const kuboInterest = (principal: number, annualRate: number, days: number) => {
  const kuboEffectiveTaxRate = 0.077;
  return principal * (annualRate / 100) * (days / 365) * (1 - kuboEffectiveTaxRate);
};

export const mifelInterest = (principal: number, annualRate: number, days: number, daysBase = 360) =>
  principal * (annualRate / 100) * (days / daysBase);

export const openbankTieredInterest = (
  principal: number,
  firstTierRate: number,
  secondTierRate: number,
  days: number,
  daysBase = 360,
) => {
  const firstTier = Math.min(Math.max(0, principal), 30000);
  const secondTier = Math.min(Math.max(0, principal - 30000), 970000);
  const thirdTier = Math.max(0, principal - 1000000);
  return (
    (firstTier * firstTierRate / 100 +
      secondTier * secondTierRate / 100 +
      thirdTier * 6.5 / 100) *
    (days / daysBase)
  );
};

export const openbankInterest = (
  principal: number,
  annualRate: number,
  excessRate: number,
  days: number,
  daysBase = 360,
) => {
  return openbankTieredInterest(principal, annualRate, excessRate, days, daysBase);
};

export const mercadoPagoInterest = (
  principal: number,
  annualRate = 12,
  days: number,
  daysBase = 365,
) => Math.min(Math.max(0, principal), 25000) * (annualRate / 100) * (days / daysBase);

export const openbankPostingDays = (date: Date) => {
  const day = date.getDay();
  if (day === 0) return 0;
  if (day === 1) return 3;
  return 1;
};

export const flexibleUltraInterest = (
  principal: number,
  promoCap: number,
  days: number,
  promoRate: number,
  excessRate: number,
  promotionDays = 60,
) => {
  const promoDays = Math.min(days, promotionDays);
  const remainingDays = Math.max(0, days - promotionDays);
  const promoAmount = Math.min(principal, promoCap);
  const excessAmount = Math.max(0, principal - promoCap);
  const promoValue = promoAmount * Math.pow(1 + promoRate / 100 / 365, promoDays);
  const excessValue = excessAmount * Math.pow(1 + excessRate / 100 / 365, promoDays);
  return promoValue * Math.pow(1 + excessRate / 100 / 365, remainingDays) +
    excessValue * Math.pow(1 + excessRate / 100 / 365, remainingDays) - principal;
};

export const daysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

export const completedMonthsBetween = (startDate: Date, calculationDate: Date) => {
  let months =
    (calculationDate.getFullYear() - startDate.getFullYear()) * 12 +
    calculationDate.getMonth() -
    startDate.getMonth();
  if (calculationDate.getDate() < startDate.getDate()) months -= 1;
  return Math.max(0, months);
};

export const getCalculatedUpdatedBalance = (
  availableBalance: number,
  totalAccumulated: number,
  calculationMethod: string,
  monthlyYield: number,
  completedMonths: number,
) => {
  const isAccumulationMethod = [
    "compound",
    "simple",
    "simple360",
    "kubo",
    "openbank",
    "mifel360",
  ].includes(calculationMethod);
  const fallback = availableBalance + (
    isAccumulationMethod
      ? totalAccumulated
      : monthlyYield * completedMonths
  );
  return Math.max(0, fallback);
};
