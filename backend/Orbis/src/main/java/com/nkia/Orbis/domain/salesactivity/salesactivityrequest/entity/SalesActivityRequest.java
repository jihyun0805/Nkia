package com.nkia.Orbis.domain.salesactivity.salesactivityrequest.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.user.entity.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SalesActivityRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_activity_id", unique = true)
    private SalesActivity salesActivity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_user_id")
    private User requestUser;
}