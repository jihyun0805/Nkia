package com.nkia.Orbis.domain.activity.salesactivityrequest.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ActivityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.request.SalesActivityRequestCreateRequest;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.response.SalesActivityRequestListResponse;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.response.SalesActivityRequestResponse;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.activity.salesactivityrequest.repository.SalesActivityRequestRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.alarm.entity.AlarmType;
import com.nkia.Orbis.domain.alarm.event.AlarmEvent;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SalesActivityRequestService {

    private final SalesActivityRequestRepository salesActivityRequestRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public SalesActivityRequestResponse create(SalesActivityRequestCreateRequest request) {

        User targetUser = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        User requestUser = userRepository.findById(UUID.fromString(SecurityUtil.getCurrentUserId()))
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        SalesActivityRequest salesActivityRequest = SalesActivityRequest.create(
                request.getTitle(),
                targetUser,
                requestUser,
                request.getActivityPurpose(),
                request.getActivityType(),
                request.getActivityDateTime(),
                request.getRequestContent()
        );

        SalesActivityRequest saved = salesActivityRequestRepository.save(salesActivityRequest);

        eventPublisher.publishEvent(new AlarmEvent(
                requestUser,
                targetUser,
                AlarmType.ACTIVITY_REQUEST,
                "새로운 활동 요청이 등록되었습니다.",
                saved.getId()
        ));

        return SalesActivityRequestResponse.from(saved);
    }

    @Transactional
    public List<SalesActivityRequestListResponse> getSalesActivityRequests() {
        return salesActivityRequestRepository.findAll()
                .stream()
                .map(SalesActivityRequestListResponse::from)
                .toList();
    }

    @Transactional
    public SalesActivityRequestResponse getSalesActivityRequest(Long salesActivityRequestId) {
        SalesActivityRequest salesActivityRequest = salesActivityRequestRepository.findById(salesActivityRequestId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.SALES_ACTIVITY_REQUEST_NOT_FOUND));
        return SalesActivityRequestResponse.from(salesActivityRequest);
    }

    @Transactional
    public List<SalesActivityRequestListResponse> getMySalesActivityRequests() {
        UUID currentUserId = UUID.fromString(SecurityUtil.getCurrentUserId());

        return salesActivityRequestRepository.findByTargetUserId(currentUserId)
                .stream()
                .map(SalesActivityRequestListResponse::from)
                .toList();
    }
}
