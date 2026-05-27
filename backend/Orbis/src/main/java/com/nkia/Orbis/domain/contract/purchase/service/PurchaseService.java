package com.nkia.Orbis.domain.contract.purchase.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.domain.contract.purchase.dto.response.PurchaseResponse;
import com.nkia.Orbis.domain.contract.purchase.entity.Purchase;
import com.nkia.Orbis.domain.contract.purchase.repository.PurchaseRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;

    @Transactional
    public List<PurchaseResponse> getPurchases() {
        return purchaseRepository.findAll()
                .stream()
                .map(PurchaseResponse::from)
                .toList();
    }

    @Transactional
    public PurchaseResponse getPurchase(Long purchaseId) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.PURCHASE_NOT_FOUND));

        return PurchaseResponse.from(purchase);
    }
}
