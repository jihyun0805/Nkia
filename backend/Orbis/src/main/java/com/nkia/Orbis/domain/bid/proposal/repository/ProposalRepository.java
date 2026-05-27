package com.nkia.Orbis.domain.bid.proposal.repository;

import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProposalRepository extends JpaRepository<Proposal, Long> {

    /**
     * [1] 목록 조회용 (List) 목록 화면에서는 파일 정보나 지원 요청자(User) 상세 정보까지는 필요하지 않습니다. 따라서 DTO 변환에 꼭 필요한 '사업기회', '고객사', 'RFP결과',
     * '지원요청(기본)' 까지만 Fetch Join 합니다.
     */
    @EntityGraph(attributePaths = {
            "projectOpportunity",
            "projectOpportunity.customerCompany",
            "projectOpportunity.rfpAnalyzeResult",
            "salesActivityRequest"
    })
    @Query("SELECT p FROM Proposal p")
    Page<Proposal> findProposalList(Pageable pageable);

    /**
     * [2] 상세 조회용 (Detail) 상세 화면에서는 연결된 파일(files)과 지원 요청의 작성자(requestUser) 정보까지 모두 필요합니다. 단, 컬렉션(files)을 Fetch Join 할 때는
     * 페이징을 걸면 안 되며(메모리 페이징 발생), 단건 조회이므로 안전합니다.
     */
    @EntityGraph(attributePaths = {
            "projectOpportunity",
            "projectOpportunity.customerCompany",
            "projectOpportunity.rfpAnalyzeResult",
            "salesActivityRequest",
            "salesActivityRequest.requestUser",
            "files" // 1:N 관계인 파일 목록도 한 번에 가져옴
    })
    @Query("SELECT p FROM Proposal p WHERE p.id = :id")
    Optional<Proposal> findProposalDetailById(@Param("id") Long id);

    /**
     * [3] 중복 제안서 등록 방지 (Validation) 동일한 사업 기회(ProjectOpportunity)에 이미 작성 중이거나 완료된 제안서가 있는지 검증합니다.
     */
    boolean existsByProjectOpportunityId(Long projectOpportunityId);

    @EntityGraph(attributePaths = {
            "projectOpportunity",
            "projectOpportunity.customerCompany",
            "projectOpportunity.prb",
            "projectOpportunity.productModules",
            "projectOpportunity.productModules.productModule" // 납품 모듈의 이름(name)을 가져오기 위한 깊은 탐색
    })
    @Query("SELECT p FROM Proposal p WHERE p.id = :id")
    Optional<Proposal> findBidResultInfoById(@Param("id") Long id);
}