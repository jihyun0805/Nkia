package com.nkia.Orbis.domain.alarm.repository;

import com.nkia.Orbis.domain.alarm.entity.Alarm;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlarmRepository extends JpaRepository<Alarm, Long> {

    /**
     * [최적화 1] @EntityGraph를 활용한 안 읽은 알림 목록 조회
     *
     * @EntityGraph를 사용하여 코드를 간결화했습니다. - DTO 변환 시 발신자 이름(sender.getName())이 필요하므로 sender를 함께 로딩합니다.
     */
    @EntityGraph(attributePaths = {"sender"})
    List<Alarm> findByReceiverIdAndIsReadFalseOrderByCreatedAtDesc(UUID receiverId);

    /**
     * [최적화 2] 단건 상세 조회 시 권한 검증용 데이터 미리 로딩 (숨은 N+1 방지) - AlarmService.markAsRead()에서 본인 알림인지 확인하기 위해
     * alarm.getReceiver().getId()를 호출합니다. - 이때 receiver가 지연 로딩(LAZY) 상태라면 추가 쿼리가 발생하므로, findById 오버라이딩을 통해 미리 가져오도록
     * 최적화했습니다.
     */
    @Override
    @EntityGraph(attributePaths = {"receiver"})
    Optional<Alarm> findById(Long id);

    /**
     * [최적화 3] 모두 읽음 처리를 위한 벌크 연산 (Bulk Update) - 이 부분은 여러 건의 데이터를 한 번의 쿼리로 수정해야 하므로 JPQL(@Modifying) 형태를 유지합니다.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Alarm a SET a.isRead = true WHERE a.receiver.id = :receiverId AND a.isRead = false")
    int markAllAsReadByReceiverId(@Param("receiverId") UUID receiverId);
}