package com.nkia.Orbis.domain.activity.quotationhistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
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
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuotationHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer version;

    private String refNo;

    @Column(nullable = false)
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
    private List<QuotationSolutionItemHistory> quotationSolutionItems = new ArrayList<>();

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationLaborItemHistory> quotationLaborItems = new ArrayList<>();

    public static QuotationHistory create(
            Quotation quotation,
            Integer version
    ) {
        QuotationHistory history = new QuotationHistory();

        history.version = version;
        history.quotationCode = quotation.getQuotationCode();
        history.refNo = quotation.getRefNo();
        history.projectOpportunity = quotation.getProjectOpportunity();
        history.quotationDate = quotation.getQuotationDate();
        history.paymentCondition = quotation.getPaymentCondition();
        history.note = quotation.getNote();
        history.consumerTotalPrice = quotation.getConsumerTotalPrice();
        history.supplyTotalPrice = quotation.getSupplyTotalPrice();
        history.laborTotalPrice = quotation.getLaborTotalPrice();
        history.totalPrice = quotation.getTotalPrice();
        return history;
    }

    public void addSolutionItem(QuotationSolutionItemHistory item) {
        this.quotationSolutionItems.add(item);
        item.setQuotation(this);
    }

    public void addLaborItem(QuotationLaborItemHistory item) {
        this.quotationLaborItems.add(item);
        item.setQuotation(this);
    }

    @Override
    public void delete() {
        super.delete();

        for (QuotationLaborItemHistory laborItem : quotationLaborItems) {
            laborItem.delete();
        }

        for (QuotationSolutionItemHistory solutionItem : quotationSolutionItems) {
            solutionItem.delete();
        }
    }
}
