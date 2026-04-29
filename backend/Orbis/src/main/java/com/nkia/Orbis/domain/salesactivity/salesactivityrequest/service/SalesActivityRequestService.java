package com.nkia.Orbis.domain.salesactivity.salesactivityrequest.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.SalesActivityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.salesactivity.salesactivityrequest.dto.request.SalesActivityRequestCreateRequest;
import com.nkia.Orbis.domain.salesactivity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.salesactivity.salesactivityrequest.repository.SalesActivityRequestRepository;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SalesActivityRequestService {

    private final SalesActivityRequestRepository salesActivityRequestRepository;
    private final UserRepository userRepository;

    @Transactional
    public SalesActivityRequest create(
            SalesActivity salesActivity,
            SalesActivityRequestCreateRequest request
    ) {
        if (request == null) {
            return null;
        }

        if (salesActivityRequestRepository.existsBySalesActivityId(salesActivity.getId())) {
            throw new ApiException(SalesActivityErrorCode.EXIST_SALES_ACTIVITY_REQUEST);
        }

        User targetUser = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        SalesActivityRequest salesActivityRequest = SalesActivityRequest.builder()
                .salesActivity(salesActivity)
                .targetUser(targetUser)
                .activityPurpose(request.getActivityPurpose())
                .activityDateTime(request.getActivityDateTime())
                .requestContent(request.getRequestContent())
                .build();

        return salesActivityRequestRepository.save(salesActivityRequest);
    }
}
