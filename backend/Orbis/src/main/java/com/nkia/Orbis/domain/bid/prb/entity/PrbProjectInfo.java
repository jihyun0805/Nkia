package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Embeddable
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PrbProjectInfo {
  // 1. 사업 기간 (단순 날짜이므로 LocalDate)
  @Column(name = "project_start_date")
  private LocalDate projectStartDate;

  @Column(name = "project_end_date")
  private LocalDate projectEndDate;

  // 2. 입찰 구분 (반드시 String으로 저장)
  @Enumerated(EnumType.STRING)
  @Column(name = "bid_type", length = 50)
  private BidType bidType;

  // 3. 공고 일정 (일반적으로 날짜 단위 관리)
  @Column(name = "pre_spec_notice_date")
  private LocalDate preSpecNoticeDate; // 사전 규격 공고일

  @Column(name = "official_notice_date")
  private LocalDate officialNoticeDate; // 정식 공고일

  // 4. 마감 및 발표 일정 (시간 단위까지 엄격하게 관리해야 하므로 LocalDateTime)
  @Column(name = "price_bidding_datetime")
  private LocalDateTime priceBiddingDatetime; // 가격 투찰일시

  @Column(name = "proposal_deadline_datetime")
  private LocalDateTime proposalDeadlineDatetime; // 제안서 마감일시

  @Column(name = "proposal_presentation_datetime")
  private LocalDateTime proposalPresentationDatetime; // 제안 발표일시

  // 5. 평가 비율 (소수점 2자리까지 허용하는 BigDecimal 적용)
  @Column(name = "technical_eval_ratio", precision = 5, scale = 2,
      columnDefinition = "DECIMAL(5,2) CHECK (technical_eval_ratio >= 0 AND technical_eval_ratio <= 100)")
  private BigDecimal technicalEvalRatio; // 기술 평가 비율 (%)

  @Column(name = "price_eval_ratio", precision = 5, scale = 2,
      columnDefinition = "DECIMAL(5,2) CHECK (price_eval_ratio >= 0 AND price_eval_ratio <= 100)")
  private BigDecimal priceEvalRatio; // 가격 평가 비율 (%)
}
