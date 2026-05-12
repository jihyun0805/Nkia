package com.nkia.Orbis.domain.alarm.repository;

import com.nkia.Orbis.domain.alarm.entity.Alarm;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AlarmRepository extends JpaRepository<Alarm, Long> {
    // 읽지 않은 알림을 최신순으로 조회
    List<Alarm> findByReceiverIdAndIsReadFalseOrderByCreatedAtDesc(Long receiverId);
}