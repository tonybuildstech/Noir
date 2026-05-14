const DEFAULT_BACKEND_URL = "http://localhost:8000/api/v1";

export const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_BACKEND_URL;
