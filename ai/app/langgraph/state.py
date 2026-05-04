from typing import Any, Literal

from pydantic import BaseModel, Field


GraphRoute = Literal["FAST_STRUCTURED", "MIXED", "DISCOVERY", "UNKNOWN"]
GraphStatus = Literal["GOOD_ANSWER", "CLARIFICATION", "INSUFFICIENT_EVIDENCE", "UPSTREAM_DEGRADED", "UNKNOWN"]
GraphPopulationScope = Literal["ALL", "FILTERED_SET", "SINGLE_ENTITY", "UNKNOWN"]
GraphSlotStatus = Literal["EXPLICIT", "INFERRED", "DEFAULTED", "OPTIONAL_EMPTY", "MISSING_REQUIRED"]
GraphSlotPriority = Literal["REQUIRED", "DEFAULTABLE", "OPTIONAL"]
GraphFocus = Literal["RISK", "STATUS", "REASON", "WORKFLOW", "METRIC", "TIMELINE", "SUMMARY", "UNKNOWN"]
GraphTimeScope = Literal["CURRENT", "RECENT", "EXECUTION_PROGRESS", "HISTORICAL", "UNKNOWN"]


class GraphTimeRange(BaseModel):
    label: str | None = None
    startAt: str | None = None
    endAt: str | None = None


class GraphEntityScope(BaseModel):
    exactCodes: list[str] = Field(default_factory=list)
    customerTerms: list[str] = Field(default_factory=list)
    partnerTerms: list[str] = Field(default_factory=list)
    entityTerms: list[str] = Field(default_factory=list)
    scopeTerms: list[str] = Field(default_factory=list)


class GraphAggregation(BaseModel):
    metric: str | None = None
    operation: str | None = None
    groupBy: list[str] = Field(default_factory=list)
    topN: int | None = None


class GraphClarification(BaseModel):
    needed: bool = False
    reason: str | None = None
    question: str | None = None
    missingSlots: list[str] = Field(default_factory=list)


class GraphScope(BaseModel):
    customerCodes: list[str] = Field(default_factory=list)
    opportunityCodes: list[str] = Field(default_factory=list)
    contractCodes: list[str] = Field(default_factory=list)
    projectCodes: list[str] = Field(default_factory=list)
    maintenanceCodes: list[str] = Field(default_factory=list)


class GraphMetrics(BaseModel):
    plannerMs: int = 0
    resolverMs: int = 0
    totalMs: int = 0


class GraphSlotEntry(BaseModel):
    value: Any = None
    status: GraphSlotStatus = "OPTIONAL_EMPTY"
    priority: GraphSlotPriority = "OPTIONAL"
    source: str | None = None


class GraphState(BaseModel):
    requestId: str | None = None
    query: str
    rewrittenQuery: str | None = None
    rewriteReason: str | None = None
    rewriteConfidence: float | None = None
    normalizedQuery: str | None = None
    route: GraphRoute = "UNKNOWN"
    answerStatus: GraphStatus = "UNKNOWN"
    intent: str | None = None
    domain: str | None = None
    focus: GraphFocus = "UNKNOWN"
    timeScope: GraphTimeScope = "UNKNOWN"
    answerShape: str | None = None
    targetHint: str | None = None
    sourceTypeHints: list[str] = Field(default_factory=list)
    timeRange: GraphTimeRange = Field(default_factory=GraphTimeRange)
    entityScope: GraphEntityScope = Field(default_factory=GraphEntityScope)
    populationScope: GraphPopulationScope = "UNKNOWN"
    aggregation: GraphAggregation = Field(default_factory=GraphAggregation)
    comparisonPairs: list[str] = Field(default_factory=list)
    deltaWindows: list[str] = Field(default_factory=list)
    comparisonMetric: str | None = None
    phaseScope: str | None = None
    phaseFilters: dict[str, Any] = Field(default_factory=dict)
    workflowScope: str | None = None
    workflowFilters: dict[str, Any] = Field(default_factory=dict)
    evidenceScope: str | None = None
    evidenceMode: str | None = None
    requiredEvidenceTypes: list[str] = Field(default_factory=list)
    clarification: GraphClarification = Field(default_factory=GraphClarification)
    graphScope: GraphScope = Field(default_factory=GraphScope)
    semanticQuery: str | None = None
    metadataFilters: dict[str, Any] = Field(default_factory=dict)
    sourceTypeFilters: list[str] = Field(default_factory=list)
    timeFilters: dict[str, Any] = Field(default_factory=dict)
    searchMode: str | None = None
    slots: dict[str, GraphSlotEntry] = Field(default_factory=dict)
    appliedDefaults: list[str] = Field(default_factory=list)
    missingRequiredSlots: list[str] = Field(default_factory=list)
    confidenceReasons: list[str] = Field(default_factory=list)
    correctiveAction: str | None = None
    toolPlan: list[str] = Field(default_factory=list)
    attachmentSessionId: str | None = None
    explicitStartAt: str | None = None
    explicitEndAt: str | None = None
    historyTurns: int = 0
    metrics: GraphMetrics = Field(default_factory=GraphMetrics)
    customerSegmentLabel: str | None = None
    customerNameKeywords: list[str] = Field(default_factory=list)
    businessTypeFilters: list[str] = Field(default_factory=list)
    proposalTypeFilters: list[str] = Field(default_factory=list)
    listOpportunityIntent: bool = False
    draftIntent: "GraphDraftIntent | None" = None


class GraphDraftIntent(BaseModel):
    """preflight 단계에서 감지된 문서 초안 작성 의도."""

    document_type: str
    label: str
    confidence: float = 0.0
    matched_keywords: list[str] = Field(default_factory=list)
    triggered_by: Literal["explicit_keyword", "llm_classifier"] = "explicit_keyword"


GraphState.model_rebuild()
