package com.nkia.Orbis.domain.activity.salesactivityrequest.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
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
    private final UserRepository userRepository;

    @Transactional
    public SalesActivityRequestResponse create(SalesActivityRequestCreateRequest request) {

        User targetUser = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        SalesActivityRequest salesActivityRequest = SalesActivityRequest.create(
                targetUser,
                request.getActivityPurpose(),
                request.getActivityType(),
                request.getActivityDateTime(),
                request.getRequestContent()
        );

        SalesActivityRequest saved = salesActivityRequestRepository.save(salesActivityRequest);

        return SalesActivityRequestResponse.from(saved);
    }
}
