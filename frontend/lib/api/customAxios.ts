// src/api/customAxios.ts
import axios, { AxiosRequestConfig } from 'axios';

// 1. 기본 인스턴스 생성 (환경 변수에서 API 주소 로드)
export const customAxiosInstance = axios.create({
  baseURL: 'https://k14s106.p.ssafy.io', // 배포 주소
  //baseURL: 'http://localhost', // 개발 주소
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 2. Request Interceptor: JWT 토큰 자동 주입
customAxiosInstance.interceptors.request.use(
  (config) => {
    // 로컬 스토리지나 전역 상태(Zustand 등)에서 토큰을 가져옵니다.
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`; // JWT 인증 스펙 반영
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Orval이 사용할 커스텀 래퍼(Wrapper) 함수
// Orval은 생성된 API 함수에서 이 customInstance 함수를 호출하게 됩니다.
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = customAxiosInstance({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore : 컴포넌트 언마운트 시 요청 취소를 위한 설정
  promise.cancel = () => {
    source.cancel('Query was cancelled by React Query or unmount.');
  };

  return promise;
};