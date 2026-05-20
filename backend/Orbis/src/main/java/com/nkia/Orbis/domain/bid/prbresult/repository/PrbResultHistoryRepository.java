package com.nkia.Orbis.domain.bid.prbresult.repository;

import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResultHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PrbResultHistoryRepository extends JpaRepository<PrbResultHistory, Long> {

    // 다음 버전을 계산하기 위해 원본 ID의 이력 개수를 조회
    long countByPrbResultId(Long prbResultId);

    // 최신 버전 순으로 이력 조회
    List<PrbResultHistory> findByPrbResultIdOrderByVersionDesc(Long prbResultId);
}
