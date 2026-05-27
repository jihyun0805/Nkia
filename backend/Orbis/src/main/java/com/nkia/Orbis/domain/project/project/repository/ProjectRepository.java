package com.nkia.Orbis.domain.project.project.repository;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.project.project.entity.Project;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    // 해당 월(pjtNumber가 YYYYMM%로 시작하는) 중 가장 큰 번호를 조회
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p.pjtNumber FROM Project p WHERE p.pjtNumber LIKE :yearMonthStr% ORDER BY p.pjtNumber DESC LIMIT 1")
    Optional<String> findLastPjtNumberByMonth(@Param("yearMonthStr") String yearMonthStr);

    boolean existsByOrderReport(OrderReport orderReport);

    @EntityGraph(attributePaths = {"manager", "salesRepresentative", "orderReport"})
    List<Project> findAll(Sort sort);
}