package com.nkia.Orbis.domain.alarm.event;

import com.nkia.Orbis.domain.alarm.entity.Alarm;
import com.nkia.Orbis.domain.alarm.repository.AlarmRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class AlarmEventListener {

    private final AlarmRepository alarmRepository;

    // 트랜잭션이 성공적으로 커밋된 후에만 알림을 저장하도록 설정 (데이터 정합성 보장)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAlarmEvent(AlarmEvent event) {
        Alarm alarm = Alarm.builder()
                .sender(event.getSender())
                .receiver(event.getReceiver())
                .type(event.getType())
                .message(event.getMessage())
                .targetId(event.getTargetId())
                .build();

        alarmRepository.save(alarm);
    }
}