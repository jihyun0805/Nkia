package com.nkia.Orbis.domain.activity.quotation.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Quotation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private QuotationStatus status;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id")
    private Workflow workflow;

    private String refNo;

    @Column(nullable = false, unique = true)
    private String quotationCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    private LocalDate quotationDate;

    private String paymentCondition;

    private Long consumerTotalPrice;

    private Long supplyTotalPrice;

    private Long laborTotalPrice;

    private Long totalPrice;

    private String note;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationSolutionItem> quotationSolutionItems = new ArrayList<>();

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationLaborItem> quotationLaborItems = new ArrayList<>();

    public static Quotation create(
            String quotationCode,
            String refNo,
            ProjectOpportunity projectOpportunity,
            LocalDate quotationDate,
            String paymentCondition,
            String note
    ) {
        Quotation quotation = new Quotation();
        quotation.quotationCode = quotationCode;
        quotation.refNo = refNo;
        quotation.projectOpportunity = projectOpportunity;
        quotation.quotationDate = quotationDate;
        quotation.paymentCondition = paymentCondition;
        quotation.note = note;
        quotation.consumerTotalPrice = 0L;
        quotation.supplyTotalPrice = 0L;
        quotation.laborTotalPrice = 0L;
        quotation.totalPrice = 0L;
        quotation.status = QuotationStatus.DRAFT;
        return quotation;
    }

    public void addSolutionItem(QuotationSolutionItem item) {
        this.quotationSolutionItems.add(item);
        item.setQuotation(this);
    }

    public void addLaborItem(QuotationLaborItem item) {
        this.quotationLaborItems.add(item);
        item.setQuotation(this);
    }


    public void calculateTotalAmount() {
        this.consumerTotalPrice = quotationSolutionItems.stream()
                .mapToLong(QuotationSolutionItem::getConsumerPrice)
                .sum();

        this.supplyTotalPrice = quotationSolutionItems.stream()
                .mapToLong(QuotationSolutionItem::getSupplyPrice)
                .sum();

        this.laborTotalPrice = quotationLaborItems.stream()
                .mapToLong(QuotationLaborItem::getSupplyPrice)
                .sum();

        this.totalPrice = this.supplyTotalPrice + this.laborTotalPrice;
    }

    @Override
    public void delete() {
        super.delete();

        for (QuotationLaborItem laborItem : quotationLaborItems) {
            laborItem.delete();
        }

        for (QuotationSolutionItem solutionItem : quotationSolutionItems) {
            solutionItem.delete();
        }
    }

    public void update(
            String refNo,
            ProjectOpportunity projectOpportunity,
            LocalDate quotationDate,
            String paymentCondition,
            String note
    ) {
        this.refNo = refNo;
        this.projectOpportunity = projectOpportunity;
        this.quotationDate = quotationDate;
        this.paymentCondition = paymentCondition;
        this.note = note;
    }

    public void clearItems() {
        this.quotationSolutionItems.clear();
        this.quotationLaborItems.clear();

        this.consumerTotalPrice = 0L;
        this.supplyTotalPrice = 0L;
        this.laborTotalPrice = 0L;
        this.totalPrice = 0L;
    }

    public void connectWorkflow(Workflow workflow) {
        this.workflow = workflow;
    }

    public void submit(Workflow workflow) {
        this.workflow = workflow;
        this.status = QuotationStatus.PENDING;
    }

    public void approve() {
        this.status = QuotationStatus.APPROVED;
    }

    public void reject() {
        this.status = QuotationStatus.REJECTED;
    }

    public boolean isDraft() {
        return this.status == QuotationStatus.DRAFT;
    }
}