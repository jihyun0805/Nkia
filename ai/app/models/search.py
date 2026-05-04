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
