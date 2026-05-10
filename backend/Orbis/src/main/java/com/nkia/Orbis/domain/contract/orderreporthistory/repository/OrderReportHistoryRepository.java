package com.nkia.Orbis.domain.contract.orderreporthistory.repository;

import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderReportHistoryRepository extends JpaRepository<OrderReportHistory, Long> {

    int countByOrderReportCode(String orderReportCode);

    List<OrderReportHistory> findByOrderReportCodeOrderByVersionDesc(String orderReportCode);
}
