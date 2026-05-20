package com.nkia.Orbis.domain.bid.prbresult.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@Builder
@Table(name = "prb_result_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class PrbResultHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prb_result_history_id")
    private Long id;

    // 원본 PrbResult의 ID를 저장 (코드 대신 ID로 추적)
    @Column(name = "original_prb_result_id", nullable = false)
    private Long prbResultId;

    @Column(nullable = false)
    private Integer version;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prb_id", nullable = false)
    private Prb prb;

    @Column(name = "risk_factors", columnDefinition = "TEXT")
    private String riskFactors;

    @Column(name = "comprehensive_opinion", columnDefinition = "TEXT")
    private String comprehensiveOpinion;

    @Column(name = "meeting_location", length = 255)
    private String meetingLocation;

    @Column(name = "meeting_date_time")
    private LocalDateTime meetingDateTime;

    // 테이블 충돌 방지를 위해 이력 전용 테이블명 지정
    @ElementCollection
    @CollectionTable(
            name = "prb_result_history_attendee_opinion",
            joinColumns = @JoinColumn(name = "prb_result_history_id")
    )
    @Builder.Default
    private List<PrbResultAttendeeOpinion> attendeeOpinions = new ArrayList<>();

    /**
     * 원본 PrbResult 객체를 받아 History 객체를 생성하는 팩토리 메서드
     */
    public static PrbResultHistory createSnapshot(PrbResult prbResult, Integer version) {
        return PrbResultHistory.builder()
                .prbResultId(prbResult.getId())
                .version(version)
                .status(prbResult.getStatus())
                .prb(prbResult.getPrb())
                .riskFactors(prbResult.getRiskFactors())
                .comprehensiveOpinion(prbResult.getComprehensiveOpinion())
                .meetingLocation(prbResult.getMeetingLocation())
                .meetingDateTime(prbResult.getMeetingDateTime())
                // 참석자 의견 리스트 깊은 복사 (Null-safe)
                .attendeeOpinions(prbResult.getAttendeeOpinions() != null ? prbResult.getAttendeeOpinions().stream()
                        .map(PrbResultAttendeeOpinion::copy).toList() : new ArrayList<>()
                )
                .build();
    }
}