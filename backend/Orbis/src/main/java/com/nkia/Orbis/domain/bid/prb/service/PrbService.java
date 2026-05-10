package com.nkia.Orbis.domain.bid.prb.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.PrbErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.bid.prb.dto.request.PrbCreateRequestDto;
import com.nkia.Orbis.domain.bid.prb.dto.request.PrbUpdateRequestDto;
import com.nkia.Orbis.domain.bid.prb.dto.response.PrbResponseDto;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.prb.repository.PrbRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용 트랜잭션 적용 (조회 성능 최적화)
public class PrbService {

  private final PrbRepository prbRepository;
  private final ProjectOpportunityRepository projectOpportunityRepository;
  private final UserRepository userRepository;

  /**
   * 1. PRB 등록 (Create)
   */
  @Transactional
  public Long createPrb(PrbCreateRequestDto request) {
    // 1. 연관 엔티티 조회
    ProjectOpportunity opportunity = findProjectOpportunity(request.getProjectOpportunityId());
    User salesRepresentative = findUser(request.getSalesRepresentativeId());

    // 2. PRB 코드 채번 (실제로는 시퀀스나 채번 규칙에 따라 구현)
    String prbCode = generatePrbCode();

    // 3. DTO 내부의 toEntity를 통한 생성 및 데이터 매핑
    Prb prb = request.toEntity(prbCode, salesRepresentative, opportunity);

    // 4. 간접비 및 총 비용 계산 오케스트레이션
    prb.calculateTotalCost(request.getIndirectExpenseRate());

    // 5. 영속화
    return prbRepository.save(prb).getId();
  }

  /**
   * 2. PRB 정보 수정 (Update - 더티 체킹)
   */
  @Transactional
  public void updatePrb(Long id, PrbUpdateRequestDto request) {
    // 1. 기존 PRB 엔티티 및 변경될 영업 대표 조회
    Prb prb = findPrb(id);
    User newSalesRepresentative = findUser(request.getSalesRepresentativeId());

    // 2. DTO 내부의 updateEntity를 호출하여 기존 객체 정보 덮어쓰기
    request.updateEntity(prb, newSalesRepresentative);

    // 3. 변경된 비용을 바탕으로 간접비 및 총 비용 재계산
    prb.calculateTotalCost(request.getIndirectExpenseRate());

    // 더티 체킹에 의해 메서드 종료 시점에 자동으로 UPDATE 쿼리가 날아갑니다.
  }

  /**
   * 3. PRB 삭제 (Soft Delete)
   */
  @Transactional
  public void deletePrb(Long id) {
    Prb prb = findPrb(id);
    // BaseEntity에 구현된 soft delete 메서드 호출
    prb.delete();
  }

  /**
   * 4. 단건 상세 조회 (Read)
   */
  public PrbResponseDto getPrbDetail(Long id) {
    // Fetch Join이 적용된 레포지토리 메서드를 사용하여 N+1 방지
    Prb prb = prbRepository.findWithDetailsById(id)
        .orElseThrow(() -> new ApiException(PrbErrorCode.PRB_NOT_FOUND));

    return PrbResponseDto.from(prb);
  }

  /**
   * 5. 목록 조회 (페이징 + 정렬)
   */
  public Page<PrbResponseDto> getPrbList(Pageable pageable) {
    // 목록 조회용 EntityGraph가 적용된 findAll 호출
    return prbRepository.findAll(pageable).map(PrbResponseDto::from);
  }


  // ==========================================
  // Private Helper Methods
  // ==========================================

  private Prb findPrb(Long id) {
    return prbRepository.findById(id)
        .orElseThrow(() -> new ApiException(PrbErrorCode.PRB_NOT_FOUND));
  }

  private ProjectOpportunity findProjectOpportunity(Long id) {
    return projectOpportunityRepository.findById(id)
        .orElseThrow(
            () -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));
  }

  private User findUser(UUID userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
  }

  private String generatePrbCode() {
    // TODO: 향후 PRB 채번 규칙에 맞게 수정 (예: PRB-240501-001)
    return "PRB-" + System.currentTimeMillis();
  }
}
