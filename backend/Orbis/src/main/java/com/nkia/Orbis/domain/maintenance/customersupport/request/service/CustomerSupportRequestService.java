package com.nkia.Orbis.domain.maintenance.customersupport.request.service;

import com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request.CustomerSupportRequestCreateRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import com.nkia.Orbis.domain.maintenance.customersupport.request.repository.CustomerSupportRequestRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerSupportRequestService {

    private final CustomerSupportRequestRepository requestRepository;
    private final UploadFileRepository uploadFileRepository;

    /**
     * 고객지원 요청을 신규 등록합니다.
     * 등록된 요청은 결재 프로세스를 타기 위한 대기(PENDING) 상태로 시작합니다.
     */
    @Transactional
    public Long createRequest(CustomerSupportRequestCreateRequest requestDto) {

        CustomerSupportRequest request = createRequestEntity(requestDto);

        mapAttachedFiles(request, requestDto.getAttachedFileIds());

        requestRepository.save(request);

        // TODO: 등록 완료 후 권한 보유자(담당자/팀장 등)에게 알림(Notification) 전송 로직 호출

        return request.getId();
    }


    /**
     * DTO 데이터를 바탕으로 새로운 고객지원 요청(CustomerSupportRequest) 엔티티를 빌드합니다.
     */
    private CustomerSupportRequest createRequestEntity(CustomerSupportRequestCreateRequest dto) {
        return CustomerSupportRequest.builder()
                .customerCompanyCode(dto.getCustomerCompanyCode())
                .requestStartDate(dto.getRequestStartDate())
                .requestEndDate(dto.getRequestEndDate())
                .requestContent(dto.getRequestContent())
                .requesterId(dto.getRequesterId())
                .registrantId(dto.getRegistrantId())
                .salesRepId(dto.getSalesRepId())
                .supportManagerId(dto.getSupportManagerId())
                .remarks(dto.getRemarks())
                .build();
    }

    /**
     * 첨부파일 ID 리스트를 기반으로 실제 파일 엔티티들을 조회한 후,
     * 연관관계 편의 메서드를 통해 요청 엔티티에 추가합니다.
     */
    @SuppressWarnings("DuplicatedCode")
    private void mapAttachedFiles(CustomerSupportRequest request, List<Long> fileIds) {
        if (fileIds == null || fileIds.isEmpty()) {
            return;
        }
        List<UploadFile> files = uploadFileRepository.findAllById(fileIds);
        files.forEach(request::addAttachedFile);
    }
}
