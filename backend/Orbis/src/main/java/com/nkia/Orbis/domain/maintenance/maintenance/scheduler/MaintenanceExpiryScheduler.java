package com.nkia.Orbis.domain.maintenance.maintenance.scheduler;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.alarm.entity.AlarmType;
import com.nkia.Orbis.domain.alarm.event.AlarmEvent;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.repository.MaintenanceRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 유지보수 계약 기간 종료 알림 스케줄러
 *
 * 매일 오전 9시에 실행되며, 종료일이 3개월 후 또는 1개월 후인
 * 유지보수 계약에 대해 담당자에게 알림을 발송합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MaintenanceExpiryScheduler {

    private final MaintenanceRepository maintenanceRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkMaintenanceExpiry() {
        LocalDate today = LocalDate.now();
        LocalDate threeMonthsLater = today.plusMonths(3);
        LocalDate oneMonthLater = today.plusMonths(1);

        log.info("[유지보수 만료 알림] 스케줄러 실행 - 기준일: {}", today);

        processExpiryAlarm(threeMonthsLater, 3);
        processExpiryAlarm(oneMonthLater, 1);
    }

    private void processExpiryAlarm(LocalDate targetDate, int monthsRemaining) {
        List<Maintenance> freeList = maintenanceRepository.findByTypeAndEndDate(
                MaintenanceType.FREE, targetDate);
        List<Maintenance> paidList = maintenanceRepository.findByTypeAndEndDate(
                MaintenanceType.PAID, targetDate);


        for (Maintenance m : freeList) {
            User receiver = m.getRegularPm();
            if(receiver != null) {
                sendExpiryAlarm(m, receiver, monthsRemaining, AlarmType.FREE_MAINTENANCE_EXPIRY,
                        "무상유지보수", "새로운 무상유지보수 계약 체결을 진행해주십시오.");
            }
        }

        for (Maintenance m : paidList) {
            User receiver = m.getRegularPm();
            if(receiver != null) {
                sendExpiryAlarm(m, receiver, monthsRemaining, AlarmType.PAID_MAINTENANCE_EXPIRY,
                        "유상유지보수", "새로운 유상유지보수 계약 체결을 진행해주십시오.");
            }
        }
    }

    private void sendExpiryAlarm(Maintenance maintenance, User receiver, int monthsRemaining,
            AlarmType alarmType, String maintenanceTypeName, String actionMessage) {
        String customerName = getCustomerName(maintenance);
        String projectName = getProjectName(maintenance);

        String message = String.format(
                "%s고객의 %s 사업에 대한 %s 계약 기간 종료가 %d개월 앞으로 다가왔습니다. %s",
                customerName, projectName, maintenanceTypeName, monthsRemaining, actionMessage);

        eventPublisher.publishEvent(new AlarmEvent(
                null,
                receiver,
                alarmType,
                message,
                maintenance.getId()));

        log.info("[유지보수 만료 알림] 발송 - {} / {} / {}개월 전", customerName, projectName, monthsRemaining);
    }

    private String getCustomerName(Maintenance maintenance) {
        if (maintenance.getProject() != null
                && maintenance.getProject().getOrderReport() != null
                && maintenance.getProject().getOrderReport().getFinalCustomerCompany() != null) {
            return maintenance.getProject().getOrderReport().getFinalCustomerCompany().getName();
        }
        return "알 수 없는 고객";
    }

    private String getProjectName(Maintenance maintenance) {
        if (maintenance.getProject() != null) {
            return maintenance.getProject().getPjtName();
        }
        return "알 수 없는 사업";
    }
}
