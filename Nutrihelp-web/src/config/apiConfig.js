const DEFAULT_API_BASE_URL = "https://localhost:443/api";

const normalizeBaseUrl = (url) => String(url || "").replace(/\/+$/, "");

export const API_BASE_URL = normalizeBaseUrl(
  process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const apiUrl = (path) => {
  const safePath = String(path || "").startsWith("/") ? path : `/${path || ""}`;
  return `${API_BASE_URL}${safePath}`;
};
