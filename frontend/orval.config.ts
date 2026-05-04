// orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
  salesManagement: {
    // 1. 백엔드 Swagger 문서의 위치 (배포 개발 서버 기준)
    input: {
      target: 'https://k14s106.p.ssafy.io/v3/api-docs', // Spring Boot의 Docs 엔드포인트
    },
    // 2. 출력물 설정
    output: {
      mode: 'tags-split', // 백엔드 Controller의 @Tag 기준으로 파일을 예쁘게 분할 생성
      target: 'lib/api/generated/sales-api.ts', // API 호출 함수가 생성될 위치
      schemas: 'lib/api/generated/model', // DTO(TypeScript Interface)들이 생성될 폴더
      client: 'axios-functions', // 기본적으로 Axios 함수 형태로 추출
      
      // 3. 커스텀 인스턴스 (Mutator) 연결 설정 (핵심 포인트!)
      override: {
        mutator: {
          path: 'lib/api/customAxios.ts', // 앞서 만든 Custom Axios 파일 경로
          name: 'customInstance', // export한 함수 이름
        },
      },
    },
  },
});