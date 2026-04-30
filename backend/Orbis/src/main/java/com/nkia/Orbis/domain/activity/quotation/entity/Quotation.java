package com.nkia.Orbis.domain.activity.quotation.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Quotation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String quotationCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    private LocalDate quotationDate;

    private String paymentCondition;

    private Long solutionTotalAmount;

    private Long laborTotalAmount;

    private Long totalAmount;

    private String note;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationSolutionItem> quotationSolutionItems = new ArrayList<>();

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationLaborItem> quotationLaborItems = new ArrayList<>();

    private static Quotation create(
            String quotationCode,
            ProjectOpportunity projectOpportunity,
            LocalDate quotationDate,
            String paymentCondition,
            String note
    ) {
        Quotation quotation = new Quotation();
        quotation.quotationCode = quotationCode;
        quotation.projectOpportunity = projectOpportunity;
        quotation.quotationDate = quotationDate;
        quotation.paymentCondition = paymentCondition;
        quotation.note = note;
        quotation.solutionTotalAmount = 0L;
        quotation.laborTotalAmount = 0L;
        quotation.totalAmount = 0L;
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
        this.solutionTotalAmount = quotationSolutionItems.stream()
                .mapToLong(QuotationSolutionItem::getSupplyAmount)
                .sum();

        this.laborTotalAmount = quotationLaborItems.stream()
                .mapToLong(QuotationLaborItem::getSupplyAmount)
                .sum();

        this.totalAmount = this.solutionTotalAmount + this.laborTotalAmount;
    }

}