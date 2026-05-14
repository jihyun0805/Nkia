package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.alarm.entity.AlarmType;
import com.nkia.Orbis.domain.alarm.event.AlarmEvent;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.billing.repository.BillingRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BillingHandler implements WorkflowDomainHandler {

    private final BillingRepository billingRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.BILLING;
    }

    @Override
    public void onApproved(Long targetId) {
        Billing billing = billingRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        billing.approve();
        billing.approveBilling();

        sendBillingRegistrationAlarm(targetId);
    }

    private void sendBillingRegistrationAlarm(Long billingId) {
        User sender = userRepository.findById(UUID.fromString(SecurityUtil.getCurrentUserId()))
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        User receiver = userRepository.findByEmail("admin@admin.com")
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        eventPublisher.publishEvent(new AlarmEvent(
                sender,
                receiver,
                AlarmType.BILLING_ISSUE_REQUEST,
                "세금계산서 발행 요청이 승인되었습니다. 세금계산서를 발행하고 세금계산서를 등록하시겠습니까?",
                targetId));
    }

    @Override
    public void onRejected(Long targetId) {
        Billing billing = billingRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        billing.reject();
    }

    @Override
    public void onCancelled(Long targetId) {
        Billing billing = billingRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.BILLING_NOT_FOUND));

        billing.cancel();
    }
}
