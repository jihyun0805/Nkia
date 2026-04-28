## 📌 관련 Ticket Number (Related Ticket Number)
- Ticket Number: S14P31S106-

## 📝 변경 사항 (Description)
- 

## 🛠️ 작업 유형 (Type of Change)
- [ ] ✨ 기능 추가 (New Feature)
- [ ] 🐛 버그 수정 (Bug Fix)
- [ ] ♻️ 리팩토링 (Refactoring)
- [ ] 📚 문서 업데이트 (Documentation)
- [ ] 🔧 설정 변경 (Config)
- [ ] 🧪 테스트 추가/수정 (Tests)

## 🧱 체크리스트 (Checklist)
- [ ] Local에서 코드가 실행이 되나요? (제발 체크)
- [ ] env 파일 수정된 것이 있다면 공유했나요?
- [ ] 스스로 코드를 리뷰했나요? (불필요한 출력, 주석 제거 등)
- [ ] 이해하기 어려운 부분에 주석을 달았나요?
- [ ] 필요한 경우 문서를 업데이트했나요? (API 명세서, README 등)
- [ ] 새로운 기능에 대한 테스트를 작성했나요?

## 🧱 Backend 체크리스트 (Checklist)
- [ ] (Backend) Controller 반환 타입이 ResponseEntity<ApiResponse<데이터>> 인가요?
- [ ] (Backend) 서비스 예외 발생 시 throw new ApiException(ErrorCode.enum);로 던지고 ErrorCode를 생성했나요?
- [ ] (Backend) GET, POST 구분 잘 했나요?
- [ ] (Backend) /api/v1 또 붙이지 않았나요?
- [ ] (Backend) swagger 관련 annotation 추가했나요? (@Tag, @Operation)
- [ ] (Backend) 메서드 길이는 너무 길지 않나요? (15~20줄 이내로...)
- [ ] (Backend) 패키지명은 소문자, 클래스는 대문자로 시작 & 명사형, 메서드는 소문자로 시작 & 동사형인가요?
- [ ] (Backend) dto말고 entity를 반환하는 곳은 없나요?
