package com.nkia.Orbis.domain.contract.contractsummary.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.contract.contractsummary.dto.request.ContractCreateRequest;
import com.nkia.Orbis.domain.contract.contractsummary.dto.response.ContractResponse;
import com.nkia.Orbis.domain.contract.contractsummary.service.ContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
            ContractCreateRequest request
    ) {
        ContractResponse response = contractService.create(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}
