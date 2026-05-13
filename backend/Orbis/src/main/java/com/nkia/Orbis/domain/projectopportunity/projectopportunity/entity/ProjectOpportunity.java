package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
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
import jakarta.persistence.OneToOne;
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
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "project_opportunity", indexes = {
        @Index(name = "idx_opportunity_code", columnList = "opportunity_code", unique = true)
})
@SQLRestriction("deleted = false")
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    @Column(name = "expected_bid_date")
    private LocalDate expectedBidDate; // 입찰 or 계약 시점

    @Column(name = "expected_budget", precision = 15, scale = 2)
    private BigDecimal expectedBudget; // 예상 사업비

    @Lob
    @Column(name = "description")
    private String description; // 주요 사업 및 이슈 내용

    @Column(name = "competition_status")
    private String competitionStatus; // 경쟁 상황 서술

    // 접촉 라인 매핑
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

    @OneToOne(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private RfpAnalyzeResult rfpAnalyzeResult;

    @OneToOne(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Prb prb;

    @OneToOne(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private BidResult bidResult;

    @OneToOne(mappedBy = "projectOpportunity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private OrderReport orderReport;

    // 안전한 객체 생성을 위한 생성자 레벨의 @Builder - 컬렉션(List) 필드는 제외하여 JPA가 초기화한 ArrayList 객체를 보호합니다.
    @Builder
    public ProjectOpportunity(String opportunityCode, String opportunityName, ProjectOpportunityStage stage,
                              ProductClass projectType, LocalDate expectedBidDate,
                              BigDecimal expectedBudget, String description, String competitionStatus,
                              User salesRepresentative, Company customerCompany) {
        this.opportunityCode = opportunityCode;
        this.opportunityName = opportunityName;
        this.stage = stage != null ? stage : ProjectOpportunityStage.FINDING;
        this.projectType = projectType;
        this.expectedBidDate = expectedBidDate;
        this.expectedBudget = expectedBudget;
        this.description = description;
        this.competitionStatus = competitionStatus;
        this.salesRepresentative = salesRepresentative;
        this.customerCompany = customerCompany;
    }

    // [2] 연관관계 편의 메서드 (접촉 라인 추가)
    public void addContactRoute(Company company, int sequence) {
        ProjectOpportunityContactRoute route = ProjectOpportunityContactRoute.builder()
                .projectOpportunity(this)
                .company(company)
                .sequence(sequence) // 접촉 순서
                .build();
        this.contactRoutes.add(route);
    }

    // [3] 더티 체킹을 위한 정보 수정 비즈니스 메서드
    public void updateInformation(String opportunityName, ProjectOpportunityStage stage,
                                  ProductClass projectType, LocalDate expectedBidDate,
                                  BigDecimal expectedBudget, String description,
                                  String competitionStatus, User salesRepresentative) {
        this.opportunityName = opportunityName;
        this.stage = stage != null ? stage : this.stage;
        this.projectType = projectType;
        this.expectedBidDate = expectedBidDate;
        this.expectedBudget = expectedBudget;
        this.description = description;
        this.competitionStatus = competitionStatus;
        this.salesRepresentative = salesRepresentative;
    }

    public void assignRfpAnalyzeResult(RfpAnalyzeResult rfpAnalyzeResult) {
        this.rfpAnalyzeResult = rfpAnalyzeResult;
        if (rfpAnalyzeResult != null && rfpAnalyzeResult.getProjectOpportunity() != this) {
            rfpAnalyzeResult.assignProjectOpportunity(this);
        }
    }

    public void assignPrb(Prb prb) {
        this.prb = prb;

        // 무한 루프 방지 및 자식 엔티티의 참조 동기화
        if (prb != null && prb.getProjectOpportunity() != this) {
            prb.assignProjectOpportunity(this);
        }
    }

    public void assignOrderReport(OrderReport orderReport) {
        this.orderReport = orderReport;

        // 무한 루프 방지 및 자식 엔티티의 참조 동기화
        if (orderReport != null && orderReport.getProjectOpportunity() != this) {
            orderReport.assignProjectOpportunity(this);
        }
    }
}
