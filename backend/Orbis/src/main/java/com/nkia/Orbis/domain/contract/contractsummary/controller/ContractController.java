package com.nkia.Orbis.domain.contract.contractsummary.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.contract.contractsummary.dto.request.ContractRequest;
import com.nkia.Orbis.domain.contract.contractsummary.dto.response.ContractListResponse;
import com.nkia.Orbis.domain.contract.contractsummary.dto.response.ContractResponse;
import com.nkia.Orbis.domain.contract.contractsummary.service.ContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Contract", description = "계약 내역 관리 API")
@RestController
@RequestMapping("/contract/summaries")
@RequiredArgsConstructor
public class ContractController {
    private final ContractService contractService;

    @Operation(summary = "계약 내역 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<ContractResponse>> createContract(
            @Valid
            @RequestBody
            ContractRequest request
    ) {
        ContractResponse response = contractService.create(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "계약 내역 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ContractListResponse>>> getContracts() {
        List<ContractListResponse> response = contractService.getContracts();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "계약 내역 상세 조회")
    @GetMapping("/{contractId}")
    public ResponseEntity<ApiResponse<ContractResponse>> getContract(
            @PathVariable("contractId") Long contractId
    ) {
        ContractResponse response = contractService.getContract(contractId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "계약 내역 삭제")
    @DeleteMapping("/{contractId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("contractId") Long contractId
    ) {
        contractService.delete(contractId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
