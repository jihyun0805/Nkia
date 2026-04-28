# OCR Troubleshooting Notes

이 문서는 명함 OCR 기능을 실제 이미지로 검증하면서 겪은 문제와 대응 내역을 정리한 기록이다.

## 목적

- 로컬에서 실제 명함 이미지로 OCR 결과를 빠르게 확인한다.
- OCR 엔진 문제와 후처리 휴리스틱 문제를 분리해서 본다.
- 카드별 실패 패턴을 누적해서 다음 개선 기준으로 삼는다.

## 확인 경로

로컬 Windows 가상환경 대신 Docker 기반 임시 OCR API를 사용했다.

이유:

- Windows 로컬 환경에서 `paddleocr` 실행 시 런타임 문제가 있었다.
- 실제 운영 예정 환경이 Docker라서, Docker 기준 검증이 더 의미가 있다.
- OCR만 빠르게 검증하려고 `scripts/ocr_only_app.py`로 최소 앱을 띄웠다.

실행 형태:

```bash
docker run --rm -d --name orbis-ocr-only -p 18002:8000 \
  -v /c/Users/SSAFY/nkia/S14P31S106/ai/app:/workspace/app \
  -v /c/Users/SSAFY/nkia/S14P31S106/ai/scripts:/workspace/scripts \
  -e PYTHONPATH=/workspace:/app \
  orbis-ai-ocr-local \
  sh -c "/app/.venv/bin/python -m uvicorn scripts.ocr_only_app:app --host 0.0.0.0 --port 8000 --app-dir /workspace"
```

요청 예시:

```bash
curl.exe -X POST \
  -F "file=@C:\Users\SSAFY\nkia\S14P31S106\ai\local_ocr_lab\business_card\card13.png;type=image/png" \
  http://127.0.0.1:18002/ocr/business-card
```

## 초기 문제

### 1. `async` 엔드포인트에서 OCR을 동기 실행

문제:

- FastAPI `async` 엔드포인트 안에서 PIL, NumPy, PaddleOCR 추론을 직접 실행했다.
- 동시 요청 시 이벤트 루프를 오래 점유할 수 있다.

대응:

- `app/api/ocr.py`에서 OCR 실행을 `run_in_threadpool(...)`로 분리했다.

### 2. 입력 검증 부족

문제:

- `content_type`만 확인하고 실제 이미지 decode 실패를 따로 처리하지 않았다.
- 빈 파일, 깨진 이미지, 과대 파일이 모두 불안정했다.

대응:

- 빈 파일 400
- 비이미지 400
- decode 실패 400
- `10MB` 초과 파일 400

### 3. Windows 로컬 PaddleOCR 실행 불안정

문제:

- Windows `.venv`에서 `torch` DLL 로드 실패와 Paddle 추론 오류가 발생했다.
- 실제 이미지로 결과 확인이 어려웠다.

대응:

- 로컬 Windows 직접 실행 대신 Docker 기반 Linux 컨테이너로 우회했다.
- `torch` 선로딩도 추가했지만, 실측 검증은 Docker를 기준으로 진행했다.

## 후처리 개선 내역

### 1. OCR 결과를 문자열만 보지 않고 후보 구조로 관리

변경:

- `OCRLine` 구조를 도입했다.
- `text`, `order`, `top`, `left`, `width`, `height`를 함께 다룬다.

효과:

- 상단 텍스트 우선
- 큰 텍스트 가점
- 인접 라인끼리 이름/직급 관계 추정

### 2. 회사명 추출 보강

문제:

- 사람 이름, 슬로건, 주소, 인증 문구가 회사명으로 오인됐다.

대응:

- 회사명 후보 점수화
- `corp`, `inc`, `(주)` 같은 힌트 가점
- 슬로건 감점
- 이름 형태 감점
- 부서/직급/주소성 텍스트 감점
- 특수문자 노이즈 감점

### 3. 이름 추출 보강

문제:

- `계장`, `경기도`, `여성기업` 같은 비이름 텍스트가 이름으로 선택됐다.
- 영문 이름이 두 줄로 나뉘면 합치지 못했다.

대응:

- 한글 이름/영문 이름 판별 강화
- 두 줄 영문 이름 병합
- 이름 근처 직급 추정
- 주소성 텍스트를 이름 후보에서 제외
- 회사명/부서/업무로 보이는 텍스트 감점

### 4. 이메일 복원 보강

문제:

- `navercom`, `daumcom`, `mindsze77tonaverCom`처럼 OCR이 `@`나 `.`를 깨뜨렸다.

대응:

- `navercom -> @naver.com`
- `daumcom -> @daum.net`
- `local + to/ta/tn + domain` 패턴을 `local@domain`으로 복원
- 여러 후보가 있으면 더 긴 local-part를 우선

### 5. 전화번호 / 팩스 복원 보강

문제:

- `FAX`와 번호가 줄 분리되는 경우가 있었다.
- `010 / 2282 / 8119`처럼 번호가 3줄로 찢어졌다.

대응:

- `fax_phone` 필드 추가
- `FAX` 라벨 pending 처리
- 분절된 휴대폰 번호 병합
- `O -> 0`, `] 제거`, `| -> 1` 같은 문자 정규화

## 이미지별 관찰

### `card1`

- 전화번호는 비교적 잘 잡힘
- 이름/직급/기관 분리 실패
- 한글 명함에서 상단 노이즈와 본문 필드 구분이 약했음

### `card2`

- 초기에는 `Jason`만 이름으로 인식
- 개선 후 `Jason Lee`로 병합
- `Manager`는 직급으로 추출
- 회사명은 여전히 불안정한 편

### `card6`

- 연락처 복원은 어느 정도 됨
- 회사명 후보는 `(주)` 계열 쪽으로 이동
- 하지만 이름/직급은 OCR 원문 자체가 많이 깨져서 여전히 불안정
- 이 카드는 후처리보다 OCR 원문 품질 개선 영향이 더 큼

### `card12`

- `fax_phone` 추출 문제를 확인한 카드
- 원본에는 `FAX 02-2773-1235`가 있었지만 OCR이 처음엔 번호를 놓쳤다.
- 라벨-번호 연결 규칙 보강 후 `fax_phone` 추출 성공
- 현재도 `mobile_phone`, `company_name`, `position` 분리는 추가 개선 여지가 있음

최신 확인값:

- `contact_name`: `김기아`
- `office_phone`: `02-2773-1234`
- `fax_phone`: `02-2773-1235`
- `email`: `madcomma@daum.net`

### `card13`

초기 결과:

- `company_name: 마%인`
- `contact_name: 경기도`
- `email: ta@naver.com`

개선 포인트:

- 주소성 텍스트를 이름 후보에서 제외
- 더 길고 정상적인 한글 회사명 후보 우선
- 이메일 후보 중 더 긴 local-part 우선

최신 결과:

```json
{
  "company_name": "마인드사이즈",
  "contact_name": null,
  "position": null,
  "email": "mindsze77@naver.com",
  "mobile_phone": "010-0000-0000",
  "office_phone": "031-000-0000",
  "fax_phone": null
}
```

해석:

- 회사명, 이메일, 전화번호는 개선됨
- 이름은 OCR 원문에서 뚜렷한 후보가 부족해서 아직 미추출

## 테스트 정리

추가된 테스트 종류:

- OCR 서비스 단위 테스트
- OCR API 입력 검증 테스트
- 영문 이름 병합 테스트
- 팩스 번호 추출 테스트
- 노이즈 이메일/전화 복원 테스트
- 슬로건/주소 오인식 방지 테스트

실행:

```bash
./.venv/Scripts/python.exe -m unittest discover -s tests -v
```

현재 기준:

- 전체 `16`개 테스트 통과

## 남은 이슈

### 1. OCR 원문 품질 의존성

- `card6`처럼 원문이 많이 깨지는 경우, 후처리만으로 복구 한계가 분명하다.

### 2. 회사명 vs 직급 분리

- `card12`처럼 `카마스터`를 회사명으로 볼지 직급으로 볼지 애매한 케이스가 있다.

### 3. 이름 미추출 케이스

- `card13`처럼 이름 후보 자체가 OCR 원문에 명확히 남지 않으면 후처리로 해결이 어렵다.

## 다음 우선순위

1. 이미지 전처리 개선으로 원문 OCR 품질 향상
2. 회사명/직급/부서 간 후보 점수 체계 추가 정교화
3. `local_ocr_lab/labels`를 채워서 카드별 정답 기반 평가 자동화
4. 실제 운영 이미지 샘플을 늘려 회귀 테스트 강화

## 2026-04-27 Card14 Regression After Address Field

- Symptom:
  - After adding `address`, `card14` started returning unstable identity fields.
  - Example bad output:
    - `company_name: "9"`
    - `contact_name: "��ǥ"`
    - `email: null`
- Cause:
  - Address detection logic was shared between address extraction and identity-field exclusion.
  - Broader address rules changed company/name candidate filtering.
  - `card14` also had OCR noise such as `9`, `goodnuancethingsagmail`, and `Icom`.
- Fix:
  - Split address logic into two layers.
  - `_looks_like_address_text(...)` stays broad for actual address extraction.
  - `_looks_like_address_exclusion_text(...)` is narrower for company/name exclusion.
  - Penalized digit-only lines, short English fragments, and email-like fragments in company scoring.
  - Added brand-like company bonus for values such as `good_nuance_things`.
  - Added a regression test for `card14`.
- Result:
  - Address support stays enabled.
  - Identity-field extraction is less coupled to broad address rules.
  - Regression test passes.

## 2026-04-28 Rule-Based Extraction Replaced With Torch/BERT Inference

- Symptom:
  - `business_card_ocr.py` originally returned structured fields by running rule-based extraction after PaddleOCR.
  - The target flow changed to:
    - PaddleOCR extracts raw OCR lines.
    - Torch/BERT classifies each line into fields.
    - API still returns the same structured JSON response.

- Final flow:
  - `business_card_ocr.py`
    - image preprocessing
    - PaddleOCR execution
    - `raw_text + lines` creation
    - final `BusinessCardOcrResponse` assembly
  - `business_card_field_classifier.py`
    - loads `local_ocr_lab/pytorch_outputs/field_classifier.pt`
    - loads `field_classifier_metadata.json`
    - runs BERT inference on OCR lines
    - returns `{field_name: line_text}`

- Important distinction:
  - `labels/`: ground-truth structured data for training.
  - `paddleoutputs/`: PaddleOCR-like raw training input, expected as `raw_text + lines`.
  - `pytorch_outputs/`: trained torch/BERT artifacts.

- Current inference input shape:

```json
{
  "raw_text": "ACME Corp.\nKim Minsoo\nmobile 010-1234-5678",
  "lines": [
    {
      "text": "ACME Corp.",
      "line_index": 0,
      "top": 10,
      "left": 20,
      "width": 180,
      "height": 32
    }
  ]
}
```

- Model actually receives:

```python
[
    "ACME Corp.",
    "Kim Minsoo",
    "mobile 010-1234-5678",
]
```

- Result:
  - Rule-based field selection was removed from the active service path.
  - Email/phone normalization remains as light post-processing of model-selected lines.
  - Legacy rule-based code was moved to `local_ocr_lab/business_card_ocr_legacy_rules.py` for reference.

## 2026-04-28 BERT Artifact And Metadata Notes

- Symptom:
  - Service inference must know whether the saved `.pt` file is a BERT classifier.
  - A previous CharLSTM artifact can exist at the same path and cause confusion.

- Required artifact files:

```text
local_ocr_lab/pytorch_outputs/field_classifier.pt
local_ocr_lab/pytorch_outputs/field_classifier_metadata.json
```

- Required metadata values:

```json
{
  "model_type": "bert_multilingual_line_classifier",
  "model_name": "bert-base-multilingual-cased",
  "label_to_idx": {
    "company_name": 0,
    "contact_name": 1,
    "position": 2,
    "address": 3,
    "email": 4,
    "mobile_phone": 5,
    "office_phone": 6,
    "fax_phone": 7,
    "responsibility": 8,
    "department_name": 9,
    "none": 10
  },
  "feature_size": 6,
  "max_length": 64,
  "confidence_threshold": 0.4
}
```

- Fix:
  - `business_card_field_classifier.py` was simplified to BERT-only inference.
  - CharLSTM fallback code was removed from the active service path.
  - If `model_type` is not `bert_multilingual_line_classifier`, the service does not load that artifact.

- Verification:

```bash
uv run python -c "from app.services.business_card_field_classifier import predict_business_card_fields; print(predict_business_card_fields(['ACME Corp.', 'Kim Minsoo', 'mobile 010-1234-5678']))"
```

## 2026-04-28 GMS Dummy Data Generation Shape

- Symptom:
  - The initial dummy-data idea mixed generated card images, structured labels, and OCR outputs.
  - For this project, generated PNG images are not needed because PaddleOCR is still the real OCR engine.

- Correct generated data:
  - `labels/card_synth_XXXX.json`: structured ground truth.
  - `paddleoutputs/card_synth_XXXX.json`: raw OCR-like text and line list.

- Correct `paddleoutputs` shape:

```json
{
  "raw_text": "한국소프트웨어개발\n김민수\n팀장\n010-1234-5678",
  "lines": [
    {
      "text": "한국소프트웨어개발",
      "line_index": 0
    },
    {
      "text": "김민수",
      "line_index": 1
    }
  ]
}
```

- Notes:
  - `paddleoutputs` is not produced by torch training.
  - It is the input-side OCR text used to train torch.
  - `pytorch_outputs` is the torch training result.

## 2026-04-28 Colab / GPU Training Notes

- Recommendation:
  - BERT training should be done on GPU when dataset size grows.
  - CPU inference is still acceptable for low-throughput service usage.

- Practical workflow:
  - Keep code in Git.
  - Keep private/heavy training data outside Git if desired.
  - In Colab:
    - clone repo
    - mount Google Drive for `labels/` and `paddleoutputs/`
    - run BERT training
    - copy back `field_classifier.pt` and `field_classifier_metadata.json`

- GPU check:

```bash
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu')"
```

- Training command:

```bash
cd ai
python local_ocr_lab/train_bert_field_classifier.py --epochs 10 --batch-size 16
```

## 2026-04-28 local_ocr_lab Git Ignore Cause

- Symptom:
  - `local_ocr_lab` did not appear in `git status`.
  - It was unclear whether `.gitignore` or another Git rule ignored it.

- Cause:
  - The ignore rule was in local Git exclude:

```text
.git/info/exclude
```

- Previous broad rule:

```gitignore
ai/local_ocr_lab/
```

- Recommended setup:
  - Do not ignore the whole `local_ocr_lab` folder if training scripts should be versioned.
  - Ignore only private/heavy data and artifacts:

```gitignore
ai/local_ocr_lab/labels/
ai/local_ocr_lab/paddleoutputs/
ai/local_ocr_lab/pytorch_outputs/
ai/local_ocr_lab/hf_cache/
ai/local_ocr_lab/business_card/
ai/local_ocr_lab/.env*
```

- Meaning:
  - `.git/info/exclude` is local-only and not shared with teammates.
  - `.gitignore` is committed and shared.

## 2026-04-28 Test Notes

- Current verification commands:

```bash
uv run python -m py_compile app/services/business_card_ocr.py app/services/business_card_field_classifier.py app/api/ocr.py app/schemas/ocr.py
uv run python -m unittest discover local_ocr_lab/tests
```

- Known transient issue:
  - On Windows, one test run hit `WinError 10014` while creating a `TestClient` event loop.
  - Re-running the same test command passed.
  - This looked like a transient Windows event-loop/socketpair issue, not an OCR code failure.
