import axios from "axios";
import { getValidToken } from "./token";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: BACKEND_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await getValidToken();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export default api;
