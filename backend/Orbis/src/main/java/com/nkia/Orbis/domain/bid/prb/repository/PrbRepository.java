package com.nkia.Orbis.domain.bid.prb.repository;

import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PrbRepository extends JpaRepository<Prb, Long> {

    /**
     * [상세 조회용 최적화] PrbResponseDto 반환 시 필요한 연관 엔티티(영업대표, 부서, 사업기회, 고객사)를 한 번의 쿼리로 가져오기 위해 EntityGraph를 사용합니다.
     * ProjectOpportunity의 1:1 mappedBy 필드들이 유발하는 N+1 문제를 방지하기 위해 * 연관된 1:1 자식 엔티티들도 EntityGraph에 모두 포함시킵니다.
     */
    @EntityGraph(attributePaths = {
            "salesRepresentative",
            "salesRepresentative.department",
            "projectOpportunity",
            "projectOpportunity.customerCompany",
            // --- N+1 방어용 추가 ---
            "projectOpportunity.rfpAnalyzeResult",
            "projectOpportunity.bidResult",
            "projectOpportunity.orderReport"
    })
    Optional<Prb> findWithDetailsById(Long id);

    /**
     * [목록 조회용 최적화] 목록 화면에서 최소한으로 필요한 정보(영업대표명, 사업기회명)를 효율적으로 가져옵니다. 엔티티에 설정된 soft delete(@SQLRestriction)가 적용되어 삭제되지 않은
     * 데이터만 조회됩니다.
     */
    @EntityGraph(attributePaths = {
            "salesRepresentative",
            "projectOpportunity",
            // --- N+1 방어용 추가 ---
            "projectOpportunity.rfpAnalyzeResult",
            "projectOpportunity.bidResult",
            "projectOpportunity.orderReport"
    })
    @Override
    Page<Prb> findAll(Pageable pageable);
}
