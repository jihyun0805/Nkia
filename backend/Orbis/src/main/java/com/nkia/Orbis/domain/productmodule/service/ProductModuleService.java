package com.nkia.Orbis.domain.productmodule.service;

import com.nkia.Orbis.domain.productmodule.repository.ProductModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductModuleService {
    private final ProductModuleRepository productModuleRepository;

    @Transactional
    public Produ
}
