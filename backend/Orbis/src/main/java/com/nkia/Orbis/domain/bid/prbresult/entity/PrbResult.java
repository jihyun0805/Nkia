package com.nkia.Orbis.domain.bid.prbresult.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "prb_result")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrbResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prb_result_id")
    private Long id;

    // Prb와의 관계는 지연 로딩(LAZY)으로 설정하여 N+1 문제 사전 방지
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

    // 값 타입 컬렉션 사용: 생명주기를 PrbResult에 완전히 의존
    @ElementCollection
    @CollectionTable(
            name = "prb_result_attendee_opinion",
            joinColumns = @JoinColumn(name = "prb_result_id")
    )
    private List<PrbResultAttendeeOpinion> attendeeOpinions = new ArrayList<>();

    @Builder
    public PrbResult(Prb prb, String riskFactors, String comprehensiveOpinion, String meetingLocation,
                     LocalDateTime meetingDateTime) {
        this.prb = prb;
        this.riskFactors = riskFactors;
        this.comprehensiveOpinion = comprehensiveOpinion;
        this.meetingLocation = meetingLocation;
        this.meetingDateTime = meetingDateTime;
    }

    // 값 타입 컬렉션 데이터 추가를 위한 편의 메서드
    public void addAttendeeOpinion(PrbResultAttendeeOpinion opinion) {
        this.attendeeOpinions.add(opinion);
    }
}