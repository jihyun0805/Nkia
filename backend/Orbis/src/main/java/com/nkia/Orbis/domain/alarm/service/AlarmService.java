package com.nkia.Orbis.domain.alarm.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.AlarmErrorCode;
import com.nkia.Orbis.domain.alarm.dto.response.AlarmResponse;
import com.nkia.Orbis.domain.alarm.entity.Alarm;
import com.nkia.Orbis.domain.alarm.repository.AlarmRepository;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용 트랜잭션 (조회 성능 최적화 및 CUD 방지)
public class AlarmService {

    private final AlarmRepository alarmRepository;

    /**
     * 1. 안 읽은 알림 목록 조회 (GET)
     *
     * @param receiverId 알림 수신자 ID (로그인한 유저의 UUID)
     */
    public List<AlarmResponse> getUnreadAlarms(UUID receiverId) {
        List<Alarm> alarms = alarmRepository.findByReceiverIdAndIsReadFalseOrderByCreatedAtDesc(receiverId);

        return alarms.stream()
                .map(AlarmResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 2. 알림 읽음 처리 (PATCH)
     *
     * @param alarmId 읽음 처리할 알림 ID
     * @param userId  요청을 보낸 유저 ID (권한 검증용)
     */
    @Transactional // 쓰기 작업(Update)이므로 트랜잭션 오버라이딩
    public void markAsRead(Long alarmId, UUID userId) {
        Alarm alarm = findAlarm(alarmId);

        // [보안 포인트] 본인의 알림만 읽음 처리할 수 있도록 검증
        if (!alarm.getReceiver().getId().equals(userId)) {
            throw new ApiException(AlarmErrorCode.ALARM_ACCESS_DENIED); // 권한 없음 예외
        }

        alarm.markAsRead(); // 더티 체킹(Dirty Checking)으로 인해 자동 UPDATE 쿼리 발생
    }

    /**
     * 3. 알림 전체 읽음 처리 (선택 구현: "모두 읽음" 버튼 용도)
     */
    @Transactional
    public void markAllAsRead(UUID userId) {
        alarmRepository.markAllAsReadByReceiverId(userId);
    }

    /**
     * 공통 메서드: 알림 단건 조회 및 예외 처리
     */
    private Alarm findAlarm(Long id) {
        return alarmRepository.findById(id)
                .orElseThrow(() -> new ApiException(AlarmErrorCode.ALARM_NOT_FOUND));
    }
}