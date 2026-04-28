import os
import requests
from openai import OpenAI

# 1. 환경 변수 및 클라이언트 설정
GITLAB_URL = os.environ.get("CI_SERVER_URL")
PROJECT_ID = os.environ.get("CI_PROJECT_ID")
MR_IID = os.environ.get("CI_MERGE_REQUEST_IID")
GITLAB_TOKEN = os.environ.get("GITLAB_API_TOKEN")
# GitLab CI/CD Variables에 등록할 변수명을 GMS_KEY로 맞춰주세요.
GMS_KEY = os.environ.get("GMS_KEY")

# base_url을 커스텀 주소로 덮어씌웁니다.
client = OpenAI(
    api_key=GMS_KEY,
    base_url="https://gms.ssafy.io/gmsapi/api.openai.com/v1"
)
headers = {"Private-Token": GITLAB_TOKEN}

def get_mr_diff():
    """GitLab API를 통해 MR의 변경된 코드(Diff)를 가져옵니다."""
    url = f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}/merge_requests/{MR_IID}/changes"
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    changes = response.json().get("changes", [])
    diff_text = ""
    for change in changes:
        if change.get('deleted_file'): continue # 삭제된 파일은 제외
        diff_text += f"File: {change['new_path']}\n"
        diff_text += f"{change['diff']}\n\n"
    return diff_text

def generate_mr_summary(diff_text):
    """[GPT-4o-mini] 변경 사항을 요약하여 MR 본문 내용을 작성합니다."""
    
    system_prompt = """
    너는 AI, Backend, Frontend 코드가 모두 포함된 모노레포(Monorepo) 프로젝트의 테크 리드야.
    제공된 Git Diff의 '파일 경로(예: ai/, backend/, frontend/)'를 분석하여, 이 MR이 프로젝트의 어느 영역을 어떻게 변경했는지 동료 개발자들이 한눈에 파악할 수 있게 요약해 줘.

    [요약 작성 조건]
    1. 영역 명시: 수정된 파일의 경로를 바탕으로 이 변경이 AI, Backend, Frontend 중 어느 파트에 해당하는지 명확히 구분해서 작성할 것. (여러 영역이 동시에 수정되었다면 각각 나누어서 요약할 것)
    2. 핵심 위주 요약: 단순한 코드 라인 변경이 아니라 '어떤 비즈니스 로직이나 기능이 추가/수정/삭제되었는지' 그 목적을 중심으로 요약할 것.
    3. 마크다운 포맷팅: 불필요한 서사적인 문장은 생략하고, 마크다운의 리스트(Bullet points) 형식을 사용하여 가독성을 극대화할 것.
    
    [출력 예시 포맷]
    ### 🚀 주요 변경 사항
    **[Backend]**
    - `MemberController`에 유저 프로필 조회 API 추가
    - N+1 문제 해결을 위해 `TeamRepository`에 Fetch Join 적용
    
    **[Frontend]**
    - 로그인 페이지 UI 개선 및 Tailwind CSS 클래스 최적화
    """
    user_prompt = f"다음 코드를 요약해서 MR 본문용 마크다운으로 작성해 줘:\n\n{diff_text}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "developer", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.5
    )
    return response.choices[0].message.content

def generate_code_review(diff_text):
    system_prompt = """
    너는 AI, Backend, Frontend를 아우르는 모노레포(Monorepo) 프로젝트의 테크 리드이자 10년 차 시니어 개발자야.
    제공된 Git Diff의 '파일 경로(ai/, backend/, frontend/)'를 확인하여, 해당 도메인과 기술 스택에 맞는 가장 적절하고 심도 있는 코드 리뷰를 진행해 줘.

    [프로젝트 기술 스택]
    - Backend (backend/): Java 21, Spring Boot 3.5.X, Redis, PostgreSQL, JPA, Docker, Minio, Nginx, Prometheus, Grafana, Loki, Promtail
    - Frontend (frontend/): Next.js, TypeScript, Tailwind CSS, Radix UI, React Hook Form, Zod
    - AI (ai/): Python, FastAPI, PyTorch, RAG (multilingual-e5-base) + Tool Calling, OCR (PaddleOCR)

    [공통 필수 리뷰 기준 (모든 영역 적용)]
    1. 오타 및 코드 가독성: 네이밍 컨벤션 준수 여부, 직관적이지 않은 변수/메서드명 지적.
    2. 버그 및 보안 문제: 잠재적인 NullPointerException, 메모리 누수, SQL 인젝션, XSS, 민감 정보 노출 여부.
    3. 클린 코드 및 메서드 분리: SOLID 원칙 준수, 하나의 메서드가 너무 많은 책임을 지고 있다면 '메서드 분리(Extract Method)' 제안.
    4. 예외 처리 및 방어적 프로그래밍: 놓친 엣지 케이스(Edge case)가 없는지, 비정상적인 입력에 대해 방어적으로 코딩되었는지 확인.
    5. 성능 개선점: 불필요한 연산, 비효율적인 반복문, 메모리 낭비 지적.

    [영역별 특화 리뷰 기준]
    * Backend (backend/):
      - 필수 확인: 모든 API 응답이 `ApiResponse` 클래스로 래핑되어 있는지, 예외 발생 시 `ApiException`을 throw 하도록 설계되었는지 반드시 점검할 것.
      - JPA N+1 문제, 비효율적인 DB/Redis 쿼리, Java 21 문법(Pattern Matching, Record 등)의 적절한 활용 여부 점검.
    * Frontend (frontend/):
      - Next.js 렌더링 최적화, React Hook 의존성 배열(deps) 누락, Zod를 활용한 폼 검증 로직의 안정성, 불필요한 리렌더링 방지.
    * AI (ai/):
      - FastAPI 비동기(async/await) 처리의 올바른 사용, PyTorch 텐서 메모리 누수, RAG/OCR 파이프라인에서 예외 발생 시 서버가 죽지 않도록 처리했는지 점검.

    [출력 조건]
    - 마크다운(Markdown) 형식으로 가독성 좋게 작성할 것.
    - 개선이 필요한 부분은 반드시 '기존 코드'와 '개선된 코드 스니펫'을 함께 제시하고 이유를 명확히 설명할 것.
    - 문제의 심각도에 따라 [Critical], [Warning], [Suggestion] 태그를 사용할 것.
    - 수정할 사항이 전혀 없이 완벽하다면 "LGTM (Looks Good To Me)"이라고만 출력할 것.
    """
    
    user_prompt = f"다음 Git Diff를 분석하고 각 파일이 속한 디렉토리(ai/, backend/, frontend/)의 기술 스택과 기준에 맞춰 리뷰해 줘:\n\n{diff_text}"

    # OpenAI API 호출 로직 (기존과 동일)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "developer", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2
    )
    return response.choices[0].message.content

def update_gitlab_mr(summary, review):
    """GitLab MR 본문을 업데이트하고 코멘트를 남깁니다."""
    # 1. MR 본문(Description) 업데이트
    update_url = f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}/merge_requests/{MR_IID}"
    description = f"## 🤖 AI 자동 요약\n\n{summary}"
    requests.put(update_url, headers=headers, json={"description": description})
    
    # 2. 리뷰 코멘트 추가
    note_url = f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}/merge_requests/{MR_IID}/notes"
    comment_body = f"## 🧐 AI 시니어 코드 리뷰\n\n{review}"
    requests.post(note_url, headers=headers, json={"body": comment_body})

if __name__ == "__main__":
    try:
        print("1. 코드 Diff 추출 중...")
        diff = get_mr_diff()
        
        if not diff.strip():
            print("변경된 내용이 없습니다.")
            exit(0)
            
        print("2. GPT-4o-mini를 이용한 내용 요약 중...")
        mr_summary = generate_mr_summary(diff)
        
        print("3. GPT-4o를 이용한 심도 있는 코드 리뷰 중...")
        code_review = generate_code_review(diff)
        
        print("4. GitLab MR 업데이트 중...")
        update_gitlab_mr(mr_summary, code_review)
        
        print("✅ 모든 작업이 완료되었습니다!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")