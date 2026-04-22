import axios from "axios";

// 1. 공통 설정이 적용된 Axios 인스턴스 생성
const api = axios.create({
  // Vite 환경변수 불러옴. .env 파일필수
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000, // 10초 이상 응답 없으면 에러 처리
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. 요청(Request) 인터셉터
// 백엔드로 요청을 보내기 직전에 가로채서 실행할 로직
api.interceptors.request.use(
  (config) => {
    // 나중에 로그인을 구현시 토큰을 꺼내오는 로직 추가
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 3. 응답(Response) 인터셉터
// 백엔드에서 응답이 화면에 도착하기 직전에 가로채서 실행할 로직
api.interceptors.response.use(
  (response) => {
    // 정상 응답은 그대로 통과
    return response;
  },
  (error) => {
    // 공통 에러 처리 (예: 401 권한 없음, 500 서버 에러 등)
    if (error.response?.status === 401) {
      console.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
      // 나중에 Zustand 초기화 및 로그인 페이지 이동 로직 추가
    }
    return Promise.reject(error);
  },
);

export default api;
