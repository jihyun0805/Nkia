package com.nkia.Orbis.domain.salesactivity.salesactivity.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.salesactivity.salesactivity.dto.request.SalesActivityCreateRequest;
import com.nkia.Orbis.domain.salesactivity.salesactivity.dto.response.SalesActivityResponse;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.SalesActivityAttendee;
import com.nkia.Orbis.domain.salesactivity.salesactivity.repository.SalesActivityRepository;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SalesActivityService {
    // Todo: ProjectOpportunity, SalesActivityRequest 연결
    private final SalesActivityRepository salesActivityRepository;
    //    private final ProjectOpportunityRepository projectOpportunityRepository;
//    private final SalesActivityRequestRepository salesActivityRequestRepository;
    private final UserRepository userRepository;

    @Transactional
    public SalesActivityResponse create(SalesActivityCreateRequest request) {
//        ProjectOpportunity projectOpportunity = projectOpportunityRepository
//                .findById(request.getProjectOpportunityId())
//                .orElseThrow(() -> new ApiException(ErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));

//        SalesActivityRequest salesActivityRequest = findSalesActivityRequestOrNull(
//                request.getSalesActivityRequestId()
//        );

        SalesActivity salesActivity = SalesActivity.builder()
//                .projectOpportunity(projectOpportunity)
                .projectOpportunity(null)
                .activityType(request.getActivityType())
                .activityPurpose(request.getActivityPurpose())
                .activityContent(request.getActivityContent())
                .location(request.getLocation())
                .activityDateTime(request.getActivityDateTime())
                .issue(request.getIssue())
                .nextActivity(request.getNextActivity())
                .customerInterest(request.getCustomerInterest())
                .status(request.getStatus())
                .salesActivityRequest(null)
//                .salesActivityRequest(salesActivityRequest)
                .build();

        addAttendees(salesActivity, request.getAttendeeUserIds());
        SalesActivity saved = salesActivityRepository.save(salesActivity);

        return SalesActivityResponse.from(saved);
    }

//    private SalesActivityRequest findSalesActivityRequestOrNull(Long salesActivityRequestId) {
//        if (salesActivityRequestId == null) {
//            return null;
//        }
//
//        return salesActivityRequestRepository.findById(salesActivityRequestId)
//                .orElseThrow(() -> new ApiException(SalesActivityErrorCode.SALES_ACTIVITY_REQUEST_NOT_FOUND));
//    }

    private void addAttendees(SalesActivity salesActivity, List<UUID> attendeeUserIds) {
        if (attendeeUserIds == null || attendeeUserIds.isEmpty()) {
            return;
        }

        List<User> users = userRepository.findAllById(attendeeUserIds);

        if (users.size() != attendeeUserIds.size()) {
            throw new ApiException(UserErrorCode.USER_NOT_FOUND);
        }

        for (User user : users) {
            SalesActivityAttendee attendee = new SalesActivityAttendee(user);
            salesActivity.addAttendee(attendee);
        }
    }
}
