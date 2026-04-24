package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.JoinColumn;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor
public class Purchase {

    @ElementCollection
    @CollectionTable(name = "prb_purchase_human_resource", joinColumns = @JoinColumn(name = "prb_id"))
    private List<PurchaseHumanResource> humanResources = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "prb_purchase_product", joinColumns = @JoinColumn(name = "prb_id"))
    private List<PurchaseProduct> products = new ArrayList<>();
}
