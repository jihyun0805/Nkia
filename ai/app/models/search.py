# 인수인계: 검색 서비스 내부에서 쓰는 scope/후보 모델입니다.
# 핵심 흐름: 정확 코드, sourceId scope, 검색 후보 row를 dataclass로 표현해 search_repository와 search_service 사이를 연결합니다.
# 같이 확인: 외부 API 응답 모델은 schemas/search.py이므로 내부 후보 필드와 프론트 evidence 필드를 혼동하지 마세요.
from dataclasses import dataclass, field


@dataclass(slots=True)
class ExactScope:
    exact_codes: list[str] = field(default_factory=list)
    opportunity_codes: list[str] = field(default_factory=list)
    maintenance_codes: list[str] = field(default_factory=list)
    project_codes: list[str] = field(default_factory=list)
    won_report_codes: list[str] = field(default_factory=list)

    def has_filters(self) -> bool:
        return any(
            [
                self.exact_codes,
                self.opportunity_codes,
                self.maintenance_codes,
                self.project_codes,
                self.won_report_codes,
            ]
        )
