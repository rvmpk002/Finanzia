export const getAuthToken = () => localStorage.getItem("finanzia-auth-token") ?? "";

export const authHeaders = (headers: Record<string, string> = {}) => ({
  ...headers,
  Authorization: `Bearer ${getAuthToken()}`,
});

export const investmentStorageKey = () =>
  `finanzia-investments:${getAuthToken()}`;
