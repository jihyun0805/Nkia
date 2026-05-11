package com.nkia.Orbis.domain.bid.prbresult.repository;

import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrbResultRepository extends JpaRepository<PrbResult, Long> {

    /**
     * [1] 목록 조회 (페이징 + 정렬 지원) - Prb -> ProjectOpportunity -> Company까지 이어지는 연관관계를 한 번에 Left Outer Join으로 가져옵니다. - List
     * DTO에서 사용하는 고객사 명, 사업 명 등을 N+1 문제 없이 효율적으로 조회합니다.
     */
    @Override
    @EntityGraph(attributePaths = {"prb.projectOpportunity.customerCompany"})
    Page<PrbResult> findAll(Pageable pageable);

    /**
     * [2] 상세 조회 - 상세 페이지에서 필요한 모든 기본 정보와 값 타입 컬렉션(참석자 의견)을 한 번에 조회합니다. - attendeeOpinions는 @ElementCollection이므로 Fetch
     * Join을 통해 조회 효율을 높입니다.
     */
    @Override
    @EntityGraph(attributePaths = {
            "prb.projectOpportunity.customerCompany",
            "attendeeOpinions"
    })
    Optional<PrbResult> findById(Long id);
}