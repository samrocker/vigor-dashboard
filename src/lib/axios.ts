import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens } from "./auth";

export const axiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/v1`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export type ApiResponse<T = unknown> = {
  data?: T;
  message: string;
  status: "success" | "error";
};

axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        window.location.href = "/login";
      } else {
        let retry = 3;
        while (retry > 0) {
          try {
            const response = await axiosInstance.post(
              "/auth/admin/refresh-token",
              {
                token: refreshToken,
              }
            );
            setTokens(
              response.data.data.accessToken,
              response.data.data.refreshToken
            );
            window.location.reload();
            break;
          } catch {
            retry--;
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
