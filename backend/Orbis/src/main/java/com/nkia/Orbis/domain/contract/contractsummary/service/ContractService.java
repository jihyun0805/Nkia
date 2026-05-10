package com.nkia.Orbis.domain.contract.contractsummary.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UploadFileErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.contract.contractsummary.dto.request.ContractModuleItemRequest;
import com.nkia.Orbis.domain.contract.contractsummary.dto.request.ContractRequest;
import com.nkia.Orbis.domain.contract.contractsummary.dto.response.ContractListResponse;
import com.nkia.Orbis.domain.contract.contractsummary.dto.response.ContractResponse;
import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.contract.contractsummary.entity.ContractModuleItem;
import com.nkia.Orbis.domain.contract.contractsummary.repository.ContractRepository;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContractService {

    private final ContractRepository contractRepository;
    private final OrderReportRepository orderReportRepository;
    private final ProductModuleRepository productModuleRepository;
    private final UploadFileRepository uploadFileRepository;
    private final UserRepository userRepository;

    @Transactional
    public ContractResponse create(ContractRequest request) {

        OrderReport orderReport = orderReportRepository.findById(request.getOrderReportId())
                .orElseThrow(() -> new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND));

        UploadFile contractFile = null;

        if (request.getContractFileId() != null) {
            contractFile = uploadFileRepository.findById(request.getContractFileId())
                    .orElseThrow(() -> new ApiException(UploadFileErrorCode.FILE_NOT_FOUND));
        }

        User salesRepresentative = userRepository.findById(request.getSalesRepresentativeId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

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
            for (ContractModuleItemRequest itemRequest : request.getContractModuleItems()) {
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

    @Transactional
    public List<ContractListResponse> getContracts() {
        return contractRepository.findAll()
                .stream()
                .map(ContractListResponse::from)
                .toList();
    }

    @Transactional
    public ContractResponse getContract(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.CONTRACT_SUMMARY_NOT_FOUND));

        return ContractResponse.from(contract);
    }

    @Transactional
    public void delete(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.CONTRACT_SUMMARY_NOT_FOUND));
        contract.delete();
    }

    @Transactional
    public ContractResponse update(Long contractId, ContractRequest request) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.CONTRACT_SUMMARY_NOT_FOUND));

        OrderReport orderReport = null;
        if (request.getOrderReportId() != null) {
            orderReport = orderReportRepository.findById(request.getOrderReportId())
                    .orElseThrow(() -> new ApiException(ContractErrorCode.CONTRACT_SUMMARY_NOT_FOUND));
        }

        UploadFile contractFile = null;
        if (request.getContractFileId() != null) {
            contractFile = uploadFileRepository.findById(request.getContractFileId())
                    .orElseThrow(() -> new ApiException(UploadFileErrorCode.FILE_NOT_FOUND));
        }

        User salesRepresentative = contract.getSalesRepresentative();

        if (request.getSalesRepresentativeId() != null) {
            salesRepresentative = userRepository.findById(request.getSalesRepresentativeId())
                    .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
        }

        contract.update(
                orderReport,
                contractFile,
                request.getProposalType(),
                request.getContractAmount(),
                request.getContractDate(),
                request.getMaintenanceCondition(),
                salesRepresentative
        );

        if (request.getContractModuleItems() != null) {
            contract.clearModuleItems();

            for (ContractModuleItemRequest itemRequest : request.getContractModuleItems()) {
                ProductModule productModule = productModuleRepository.findById(itemRequest.getProductModuleId())
                        .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

                ContractModuleItem item = ContractModuleItem.create(
                        productModule,
                        itemRequest.getQuantity()
                );

                contract.addModuleItem(item);
            }
        }
        return ContractResponse.from(contract);
    }
}
