export const shouldShowNuMinimumPurchaseWarning = (date: Date) => {
  const day = date.getDate();
  return day >= 1 && day <= 3;
};

export const shouldShowMercadoPagoMinimumBalanceWarning = (date: Date) => {
  const day = date.getDate();
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return day >= lastDayOfMonth - 2 && day <= lastDayOfMonth;
};

export const nuMinimumPurchaseWarningLabel = "Has una compra minima para mantener el 13%";
export const mercadoPagoMinimumBalanceWarningLabel = "Ingresa 3000 para mantener el 12%";
