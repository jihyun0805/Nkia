import axios, { AxiosRequestConfig } from "axios";
import { getAccessToken, loadAuthSession, saveAuthSession, clearAuthSession } from "../auth-session";

// 1. 기본 인스턴스 생성 (환경 변수에서 API 주소 로드)
export const customAxiosInstance = axios.create({
  baseURL: "https://k14s106.p.ssafy.io", // 배포 주소
  //baseURL: 'http://localhost', // 개발 주소
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// 2. Request Interceptor: JWT 토큰 자동 주입
customAxiosInstance.interceptors.request.use(
  (config) => {
    // localStorage 직접 접근 대신 auth-session.ts 함수 사용
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`; // JWT 인증 스펙 반영
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 3. Response Interceptor: 401 발생 시 Refresh Token으로 자동 재발급
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

customAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized이고, 로그인/리프레시 요청 자체가 아닌 경우만 재시도
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/login") && !originalRequest.url?.includes("/auth/refresh")) {
      if (isRefreshing) {
        // 이미 재발급 중이면 대기 후 새 토큰으로 재시도
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(customAxiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const session = loadAuthSession();
      if (!session?.refreshToken) {
        // Refresh Token 없으면 로그아웃 처리
        clearAuthSession();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      try {
        // Refresh Token으로 새 Access Token 요청
        const response = await customAxiosInstance.post("/auth/refresh", {
          refreshToken: session.refreshToken,
        });

        const newAccessToken = response.data?.data?.accessToken;
        const newRefreshToken = response.data?.data?.refreshToken;

        if (!newAccessToken) throw new Error("토큰 재발급 실패");

        // 세션 업데이트
        saveAuthSession({
          ...session,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || session.refreshToken,
          issuedAt: new Date().toISOString(),
        });

        // 대기 중인 요청들에게 새 토큰 전달
        onRefreshed(newAccessToken);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return customAxiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh 실패 시 로그아웃
        clearAuthSession();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// 4. Orval이 사용할 커스텀 래퍼(Wrapper) 함수
// Orval은 생성된 API 함수에서 이 customInstance 함수를 호출하게 됩니다.
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = customAxiosInstance({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore : 컴포넌트 언마운트 시 요청 취소를 위한 설정
  promise.cancel = () => {
    source.cancel("Query was cancelled by React Query or unmount.");
  };

  return promise;
};
