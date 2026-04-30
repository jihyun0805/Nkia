package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectOpportunity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_company_id")
    private Company customerCompany;

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
}
