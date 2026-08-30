export const shouldShowNuMinimumPurchaseWarning = (date: Date) => {
  const day = date.getDate();
  return day >= 1 && day <= 3;
};

export const nuMinimumPurchaseWarningLabel = "Has una compra minima para mantener el 13%";
