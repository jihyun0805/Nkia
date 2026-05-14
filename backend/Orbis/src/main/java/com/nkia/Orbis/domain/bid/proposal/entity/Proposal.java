package com.nkia.Orbis.domain.bid.proposal.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProposalErrorCode;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false") // Soft Delete 적용
public class Proposal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProposalStatus status; // 제안 상태 (준비중, 제출완료, 드랍 등)

    // [설계 포인트 1] 1:1 연관관계 - ProjectOpportunity
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id", unique = true, nullable = false)
    private ProjectOpportunity projectOpportunity;

    // [설계 포인트 2] 1:1 연관관계 - SalesActivityRequest
    // 제안서 작성 시 타 부서(기술지원팀 등)에 지원을 요청한 내역
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_activity_request_id", unique = true)
    private SalesActivityRequest salesActivityRequest;

    // [설계 포인트 3] 1:N 단방향 연관관계 - UploadFile
    // 제안서, 발표자료 등 여러 개의 파일을 가질 수 있음
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "proposal_id") // upload_file 테이블에 proposal_id FK 생성
    private List<UploadFile> files = new ArrayList<>();

    @Builder
    public Proposal(ProjectOpportunity projectOpportunity, SalesActivityRequest salesActivityRequest) {
        this.status = ProposalStatus.IN_PROGRESS; // 초기 생성 시 기본 상태
        this.projectOpportunity = projectOpportunity;
        this.salesActivityRequest = salesActivityRequest;
    }

    // --- 비즈니스 로직 (도메인 주도 설계) ---

    public void addFile(UploadFile file) {
        this.files.add(file);
    }

    public void submitProposal() {
        if (this.files.isEmpty()) {
            throw new ApiException(ProposalErrorCode.FILES_REQUIRED_FOR_COMPLETION);
        }
        this.status = ProposalStatus.COMPLETED;
    }
}