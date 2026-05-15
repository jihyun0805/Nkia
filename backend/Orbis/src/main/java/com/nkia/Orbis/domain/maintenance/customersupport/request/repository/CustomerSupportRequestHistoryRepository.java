package com.nkia.Orbis.domain.maintenance.customersupport.request.repository;

import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequestHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerSupportRequestHistoryRepository extends JpaRepository<CustomerSupportRequestHistory, Long> {
    
    // 특정 원본 요청에 대한 히스토리 목록을 최신순으로 조회
    List<CustomerSupportRequestHistory> findByOriginalRequestIdOrderByCreatedAtDesc(Long originalRequestId);
}
