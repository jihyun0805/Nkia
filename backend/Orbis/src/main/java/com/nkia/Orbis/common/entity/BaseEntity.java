package com.nkia.Orbis.common.entity;

import com.nkia.Orbis.common.util.SecurityUtil;
import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDateTime;
import lombok.Getter;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@MappedSuperclass // JPA Entity 클래스들이 이 클래스를 상속할 경우 필드들도 칼럼으로 인식하도록 함
@EntityListeners(AuditingEntityListener.class) // Auditing 기능 포함
@SQLRestriction("deleted = false")
public abstract class BaseEntity {

    @CreatedDate
    @Column(updatable = false) // 생성일은 수정되지 않게 설정
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false) // 생성자는 수정되지 않게 설정
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;

    @Column(nullable = false)
    private boolean deleted = false;

    private LocalDateTime deletedAt;

    private String deletedBy;

    public void delete() {
        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
        this.deletedBy = SecurityUtil.getCurrentUserId();
    }
}
