package com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;

@Getter
@Entity
@Table(name = "rfp_requirement")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
// JPA가 삭제 명령(remove)을 내릴 때, DELETE 대신 UPDATE 쿼리를 실행하도록 가로챔
@SQLDelete(sql = "UPDATE rfp_requirement SET deleted = true WHERE id = ?")
public class RfpRequirement extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "category", length = 50)
  private String category; // 구분 (예: 기능 요구사항, 보안 요구사항)

  @Column(name = "requirement_code", length = 50)
  private String requirementCode; // 요구사항 고유번호

  @Column(name = "name", length = 200)
  private String name; // 요구사항 명칭

  @Column(name = "description", columnDefinition = "TEXT")
  private String description; // 요구사항 내용

  @Enumerated(EnumType.STRING)
  @Column(name = "support_type", length = 30)
  private SupportType supportType; // 지원 여부

  @Column(name = "review_comment", columnDefinition = "TEXT")
  private String reviewComment; // 검토 내용

  @Column(name = "effort", precision = 5, scale = 2)
  private BigDecimal effort; // 공수 (예: 1.5 M/M)

  // 연관관계 매핑 (다대일)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "rfp_analyze_result_id", nullable = false)
  private RfpAnalyzeResult rfpAnalyzeResult;

  @Builder
  public RfpRequirement(String category, String requirementCode, String name, String description,
      SupportType supportType, String reviewComment, BigDecimal effort,
      RfpAnalyzeResult rfpAnalyzeResult) {
    this.category = category;
    this.requirementCode = requirementCode;
    this.name = name;
    this.description = description;
    this.supportType = supportType;
    this.reviewComment = reviewComment;
    this.effort = effort;
    this.rfpAnalyzeResult = rfpAnalyzeResult;
  }

  public void assignRfpAnalyzeResult(RfpAnalyzeResult rfpAnalyzeResult) {
    this.rfpAnalyzeResult = rfpAnalyzeResult;
  }

  public void update(String category, String requirementCode, String name, String description,
      SupportType supportType, String reviewComment, BigDecimal effort) {
    this.category = category;
    this.requirementCode = requirementCode;
    this.name = name;
    this.description = description;
    this.supportType = supportType;
    this.reviewComment = reviewComment;
    this.effort = effort;
  }
}
