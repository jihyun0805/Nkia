package com.nkia.Orbis.domain.activity.salesactivityrequest.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.SalesActivityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.activity.salesactivity.repository.SalesActivityRepository;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.request.SalesActivityRequestCreateRequest;
import com.nkia.Orbis.domain.activity.salesactivityrequest.dto.response.SalesActivityRequestResponse;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.activity.salesactivityrequest.repository.SalesActivityRequestRepository;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SalesActivityRequestService {

    private final SalesActivityRequestRepository salesActivityRequestRepository;
    private final SalesActivityRepository salesActivityRepository;
    private final UserRepository userRepository;

    @Transactional
    public SalesActivityRequestResponse create(SalesActivityRequestCreateRequest request) {
        SalesActivity salesActivity = salesActivityRepository.findById(request.getSalesActivityId())
                .orElseThrow(() -> new ApiException(SalesActivityErrorCode.SALES_ACTIVITY_NOT_FOUND));

        if (salesActivityRequestRepository.existsBySalesActivityId(salesActivity.getId())) {
            throw new ApiException(SalesActivityErrorCode.EXIST_SALES_ACTIVITY_REQUEST);
        }

        User targetUser = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        SalesActivityRequest salesActivityRequest = SalesActivityRequest.builder()
                .salesActivity(null)
                .targetUser(targetUser)
                .activityPurpose(request.getActivityPurpose())
                .activityDateTime(request.getActivityDateTime())
                .requestContent(request.getRequestContent())
                .build();

        salesActivity.setSalesActivityRequest(salesActivityRequest);
        SalesActivityRequest saved = salesActivityRequestRepository.save(salesActivityRequest);

        return SalesActivityRequestResponse.from(saved);
    }
}
