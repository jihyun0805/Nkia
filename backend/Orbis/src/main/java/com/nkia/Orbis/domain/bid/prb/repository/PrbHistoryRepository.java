package com.nkia.Orbis.domain.bid.prb.repository;

import com.nkia.Orbis.domain.bid.prb.entity.PrbHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PrbHistoryRepository extends JpaRepository<PrbHistory, Long> {

    // 다음 버전을 계산하기 위해 현재 코드의 이력 개수를 조회
    long countByPrbCode(String prbCode);

    // 최신 버전 순으로 이력 조회
    List<PrbHistory> findByPrbCodeOrderByVersionDesc(String prbCode);
}