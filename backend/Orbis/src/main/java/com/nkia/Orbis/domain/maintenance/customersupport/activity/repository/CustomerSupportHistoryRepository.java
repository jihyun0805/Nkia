package com.nkia.Orbis.domain.maintenance.customersupport.activity.repository;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupportHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerSupportHistoryRepository extends JpaRepository<CustomerSupportHistory, Long> {
    
    // 특정 원본 고객지원 활동에 대한 히스토리 목록을 최신순으로 조회
    List<CustomerSupportHistory> findByOriginalActivityIdOrderByCreatedAtDesc(Long originalActivityId);
}
