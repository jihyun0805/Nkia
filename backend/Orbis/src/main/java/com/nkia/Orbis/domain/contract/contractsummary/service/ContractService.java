package com.nkia.Orbis.domain.contract.contractsummary.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.contract.contractsummary.dto.request.ContractCreateRequest;
import com.nkia.Orbis.domain.contract.contractsummary.dto.request.ContractModuleItemCreateRequest;
import com.nkia.Orbis.domain.contract.contractsummary.dto.response.ContractResponse;
import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.contract.contractsummary.entity.ContractModuleItem;
import com.nkia.Orbis.domain.contract.contractsummary.repository.ContractRepository;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContractService {

    // Todo: 수주보고서, 첨부파일 구현 후 연동 필요
    private final ContractRepository contractRepository;
    //    private final OrderReportRepository orderReportRepository;
    private final ProductModuleRepository productModuleRepository;
    //    private final UploadFileRepository uploadFileRepository;
    private final UserRepository userRepository;

    @Transactional
    public ContractResponse create(ContractCreateRequest request) {

        OrderReport orderReport = null;
        UploadFile contractFile = null;

        User salesRepresentative = userRepository.findById(request.getSalesRepresentativeId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        List<ContractModuleItem> moduleItems = new ArrayList<>();

        Contract contract = Contract.create(
                orderReport,
                contractFile,
                request.getProposalType(),
                request.getContractAmount(),
                request.getContractDate(),
                request.getMaintenanceCondition(),
                salesRepresentative
        );

        if (request.getContractModuleItems() != null) {
            for (ContractModuleItemCreateRequest itemRequest : request.getContractModuleItems()) {
                ProductModule productModule = productModuleRepository.findById(itemRequest.getProductModuleId())
                        .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

                ContractModuleItem item = ContractModuleItem.create(
                        productModule,
                        itemRequest.getQuantity()
                );

                contract.addModuleItem(item);
            }
        }

        Contract savedContract = contractRepository.save(contract);

        return ContractResponse.from(savedContract);
    }

}
