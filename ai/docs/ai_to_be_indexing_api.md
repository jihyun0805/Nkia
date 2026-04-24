# AI API 문서

## Base URL

| 환경 | URL |
|---|---|
| Local | `http://localhost:8002` |
| Docker | `http://orbis_ai_api:8000` |

## 인증

내부 API 호출 시 아래 헤더가 필요하다.

```http
X-Orbis-Internal-Token: <AI_INTERNAL_TOKEN>
```

## API 목록

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| `GET` | `/health` | AI 서버 상태 확인 | 없음 |
| `GET` | `/health/db` | AI DB 상태 확인 | 없음 |
| `POST` | `/internal/index/documents` | 문서 색인/삭제 | 필요 |
| `POST` | `/internal/index/attachments` | 첨부파일 색인/삭제 | 필요 |

## 중요 연동 규칙

백엔드 연동 시 아래 3가지는 반드시 지켜야 한다.

1. 부모 문서 색인과 첨부파일 색인은 별도 API로 호출해야 한다.
   - 부모 문서: `/internal/index/documents`
   - 첨부파일: `/internal/index/attachments`
2. 부모 문서 삭제 시 연결된 첨부파일도 별도 삭제 이벤트로 호출해야 한다.
   - 부모 문서 삭제가 첨부파일 색인 삭제로 자동 전파되지는 않는다.
3. AI 색인 호출은 반드시 백엔드 DB commit 이후에 실행해야 한다.
   - DB rollback 후 AI만 색인되는 상황을 방지하기 위해서다.

권장 흐름:

- 생성/수정: DB commit -> 부모 문서 색인 -> 첨부파일 색인
- 삭제: DB commit -> 첨부파일 삭제 색인 -> 부모 문서 삭제 색인

## 1. Health Check

### `GET /health`

응답:

```json
{
  "status": "ok"
}
```

### `GET /health/db`

응답:

```json
{
  "status": "ok"
}
```

## 2. 문서 색인 API

### `POST /internal/index/documents`

설명:

- 문서 생성/수정 시 색인
- 문서 삭제 시 색인 제거
- 한 번에 최대 100건 처리

헤더:

```http
Content-Type: application/json
X-Orbis-Internal-Token: <AI_INTERNAL_TOKEN>
```

요청 본문:

```json
{
  "documents": [
    {
      "sourceType": "MAINTENANCE",
      "sourceId": "MNT-2026-0001",
      "operation": "UPSERT",
      "title": "통합관제 유지보수 제안",
      "sourcePath": "/maintenance/MNT-2026-0001",
      "content": "문서 본문 전체 텍스트",
      "payload": {
        "customerName": "한국전력",
        "summary": "2026년 유지보수 범위"
      },
      "metadata": {
        "domain": "MAINTENANCE",
        "projectId": 17
      },
      "deleted": false,
      "deletedAt": null,
      "eventId": "evt-20260423-0001",
      "occurredAt": "2026-04-23T10:30:00+09:00"
    }
  ]
}
```

요청 필드:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `documents` | array | O | 색인 대상 목록, 1~100건 |
| `sourceType` | string | O | 문서 타입 |
| `sourceId` | string | O | 원본 문서 식별자 |
| `operation` | string | X | `UPSERT`, `DELETE`, 기본값 `UPSERT` |
| `title` | string | X | 문서 제목 |
| `sourcePath` | string | X | 원본 경로 또는 URL |
| `content` | string | X | 색인할 본문 |
| `payload` | object | X | 본문이 없을 때 사용할 구조화 데이터 |
| `metadata` | object | X | 검색 결과에 포함할 메타데이터 |
| `deleted` | boolean | X | `true`면 삭제 처리 |
| `deletedAt` | datetime | X | 삭제 시각 |
| `eventId` | string | X | 중복 이벤트 식별자 |
| `occurredAt` | datetime | X | 이벤트 발생 시각 |

규칙:

- `content`가 있으면 우선 사용한다.
- `content`가 없으면 `payload`를 텍스트로 변환해 색인한다.
- `operation = "DELETE"` 또는 `deleted = true`면 삭제 처리한다.

응답 본문:

```json
{
  "results": [
    {
      "sourceType": "MAINTENANCE",
      "sourceId": "MNT-2026-0001",
      "operation": "UPSERT",
      "status": "INDEXED",
      "chunkCount": 4,
      "message": null
    }
  ]
}
```

응답 필드:

| 필드 | 타입 | 설명 |
|---|---|---|
| `sourceType` | string | 문서 타입 |
| `sourceId` | string | 원본 문서 식별자 |
| `operation` | string | 처리 operation |
| `status` | string | 처리 결과 |
| `chunkCount` | number | 생성된 chunk 수 |
| `message` | string \| null | 부가 메시지 |

상태값:

| 값 | 설명 |
|---|---|
| `INDEXED` | 정상 색인 완료 |
| `DELETED` | 삭제 완료 |
| `SKIPPED_UNCHANGED` | 변경 없음 |
| `SKIPPED_DUPLICATE` | 중복 이벤트 |
| `SKIPPED_STALE` | 오래된 이벤트 |
| `SKIPPED_EMPTY` | 색인할 텍스트 없음 |

## 3. 오류 코드

| HTTP Status | 설명 |
|---|---|
| `401` | 내부 토큰 오류 |
| `422` | 요청 값 검증 실패 |
| `500` | 서버 내부 오류 |
| `503` | 서버 설정 또는 DB 상태 문제 |

예시:

```json
{
  "detail": "Invalid internal AI token."
}
```

## 4. 첨부파일 색인 API

### `POST /internal/index/attachments`

설명:

- 첨부파일 생성/수정 시 색인
- 첨부파일 삭제 시 색인 제거
- 부모 문서 단계와 연결 정보를 함께 전달
- 한 번에 최대 100건 처리

헤더:

```http
Content-Type: application/json
X-Orbis-Internal-Token: <AI_INTERNAL_TOKEN>
```

요청 본문:

```json
{
  "attachments": [
    {
      "fileId": "88",
      "parentSourceType": "QUOTATION",
      "parentSourceId": "15",
      "operation": "UPSERT",
      "fileName": "견적서_산출근거.pdf",
      "sourcePath": "https://storage.example.com/files/88",
      "extractedText": "PDF에서 추출한 본문 텍스트",
      "extension": "pdf",
      "fileType": "application/pdf",
      "pageCount": 12,
      "rootSourceType": "PROJECT_OPPORTUNITY",
      "rootSourceId": "3",
      "documentStage": "QUOTATION_ATTACHMENT",
      "businessDomain": "QUOTATION",
      "evidenceGroupKey": "QUOTATION:15",
      "metadata": {
        "quotationId": 15,
        "projectOpportunityId": 3
      },
      "deleted": false,
      "deletedAt": null,
      "eventId": "attachment-upsert-88",
      "occurredAt": "2026-04-24T16:30:00+09:00"
    }
  ]
}
```

요청 필드:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `attachments` | array | O | 색인 대상 목록, 1~100건 |
| `fileId` | string | O | 첨부파일 식별자 |
| `parentSourceType` | string | O | 첨부파일이 속한 부모 문서 타입 |
| `parentSourceId` | string | O | 첨부파일이 속한 부모 문서 ID |
| `operation` | string | X | `UPSERT`, `DELETE`, 기본값 `UPSERT` |
| `fileName` | string | X | 첨부파일명 |
| `sourcePath` | string | X | 파일 저장 경로 또는 URL |
| `extractedText` | string | X | 파일에서 추출한 본문 |
| `extension` | string | X | 파일 확장자 |
| `fileType` | string | X | MIME 타입 |
| `pageCount` | number | X | 페이지 수 또는 시트 수 |
| `rootSourceType` | string | X | 최상위 업무 문서 타입 |
| `rootSourceId` | string | X | 최상위 업무 문서 ID |
| `documentStage` | string | X | 첨부파일이 속한 문서 단계 |
| `businessDomain` | string | X | 업무 도메인 |
| `evidenceGroupKey` | string | X | 같은 근거 그룹 식별자 |
| `metadata` | object | X | 추가 메타데이터 |
| `deleted` | boolean | X | `true`면 삭제 처리 |
| `deletedAt` | datetime | X | 삭제 시각 |
| `eventId` | string | X | 중복 이벤트 식별자 |
| `occurredAt` | datetime | X | 이벤트 발생 시각 |

규칙:

- `sourceId`는 AI 내부에서 `{parentSourceType}:{parentSourceId}:{fileId}` 기준으로 생성한다.
- `operation = "DELETE"` 또는 `deleted = true`면 첨부파일 색인을 삭제 처리한다.
- `extractedText`가 있으면 본문으로 우선 사용한다.
- `rootSourceType`, `rootSourceId`, `documentStage`, `businessDomain`, `evidenceGroupKey`는 검색/근거 묶음 품질 향상을 위해 전달을 권장한다.

응답 본문:

```json
{
  "results": [
    {
      "sourceType": "ATTACHMENT",
      "sourceId": "QUOTATION:15:88",
      "operation": "UPSERT",
      "status": "INDEXED",
      "chunkCount": 3,
      "message": null
    }
  ]
}
```
