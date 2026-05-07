package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyManager;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.productmodule.entity.ProductClass;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "project_opportunity", indexes = {
        @Index(name = "idx_opportunity_code", columnList = "opportunity_code", unique = true)
})
public class ProjectOpportunity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "opportunity_code", nullable = false, unique = true, updatable = false)
    private String opportunityCode; // 사업 기회 코드

    @Column(name = "opportunity_name", nullable = false)
    private String opportunityName; // 사업기회명

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectOpportunityStage stage; // 현재 진행 상태 (Enum)

    @Enumerated(EnumType.STRING)
    private ProductClass projectType; // 사업 구분

    @Column(name = "expected_bid_date")
    private LocalDate expectedBidDate; // 입찰 시점

    @Column(name = "expected_contract_date")
    private LocalDate expectedContractDate; // 계약 시점

    @Column(name = "expected_budget", precision = 15, scale = 2)
    private BigDecimal expectedBudget; // 예상 사업비

    @Lob
    @Column(name = "description")
    private String description; // 주요 사업 내용

    @Lob
    @Column(name = "issue_note")
    private String issueNote; // 주요 이슈 내용

    @Column(name = "competition_status")
    private String competitionStatus; // 경쟁 상황 서술

    // 1. 경쟁사 매핑 (N:M을 풀어낸 1:N 관계 예시 - Entity 별도 생성 필요)
    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectOpportunityCompetitor> competitors = new ArrayList<>();

    // 2. 의사결정구조 매핑 (순서가 포함된 중간 테이블 Entity 별도 생성 필요)
    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequence ASC") // 순서대로 정렬해서 가져오기
    private List<ProjectOpportunityDecisionMaker> decisionMakers = new ArrayList<>();

    // 3. 접촉 라인 매핑
    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequence ASC")
    private List<ProjectOpportunityContactRoute> contactRoutes = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_company_id")
    private Company customerCompany; // 고객사

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectOpportunityPartnerCompany> partnerCompanies = new ArrayList<>();

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectOpportunityProductModule> productModules = new ArrayList<>();

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SalesActivity> salesActivities = new ArrayList<>();

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Quotation> quotations = new ArrayList<>();

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RfpAnalyzeResult> rfpAnalyzeResults = new ArrayList<>();

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Prb> prbs = new ArrayList<>();

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BidResult> bidResults = new ArrayList<>();

    @OneToMany(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReport> orderReports = new ArrayList<>();

    // 안전한 객체 생성을 위한 생성자 레벨의 @Builder - 컬렉션(List) 필드는 제외하여 JPA가 초기화한 ArrayList 객체를 보호합니다.
    @Builder
    public ProjectOpportunity(String opportunityCode, String opportunityName, ProjectOpportunityStage stage,
                              ProductClass projectType, LocalDate expectedBidDate, LocalDate expectedContractDate,
                              BigDecimal expectedBudget, String description, String issueNote, String competitionStatus,
                              Company customerCompany) {
        this.opportunityCode = opportunityCode;
        this.opportunityName = opportunityName;
        this.stage = stage != null ? stage : ProjectOpportunityStage.FINDING;
        this.projectType = projectType;
        this.expectedBidDate = expectedBidDate;
        this.expectedContractDate = expectedContractDate;
        this.expectedBudget = expectedBudget;
        this.description = description;
        this.issueNote = issueNote;
        this.competitionStatus = competitionStatus;
        this.customerCompany = customerCompany;
    }

    // [2] 연관관계 편의 메서드 (경쟁사 추가)
    public void addCompetitor(Company company) {
        ProjectOpportunityCompetitor competitor = ProjectOpportunityCompetitor.builder()
                .projectOpportunity(this) // 양방향 연관관계 세팅 (자식 -> 부모)
                .competitor(company)
                .build();
        this.competitors.add(competitor); // (부모 -> 자식)
    }

    // [3] 연관관계 편의 메서드 (의사결정권자 추가)
    public void addDecisionMaker(CompanyManager manager, int sequence) {
        ProjectOpportunityDecisionMaker decisionMaker = ProjectOpportunityDecisionMaker.builder()
                .projectOpportunity(this)
                .decisionMaker(manager)
                .sequence(sequence) // 결재 순서
                .build();
        this.decisionMakers.add(decisionMaker);
    }

    // [4] 연관관계 편의 메서드 (접촉 라인 추가)
    public void addContactRoute(Company company, int sequence) {
        ProjectOpportunityContactRoute route = ProjectOpportunityContactRoute.builder()
                .projectOpportunity(this)
                .company(company)
                .sequence(sequence) // 접촉 순서
                .build();
        this.contactRoutes.add(route);
    }
}
