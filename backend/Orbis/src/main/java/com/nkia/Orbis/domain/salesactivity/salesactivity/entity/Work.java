package com.nkia.Orbis.domain.salesactivity.salesactivity.entity;

import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor
public class Work {
    private String note;
}