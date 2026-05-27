package com.nkia.Orbis.domain.admin.productmodule.init;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!no-seed")
@RequiredArgsConstructor
@Order(4)
public class ProductModuleInitializer implements CommandLineRunner {

    private final ProductModuleRepository productModuleRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {

        ClassPathResource resource =
                new ClassPathResource("data/product-modules.tsv");

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(
                        resource.getInputStream(),
                        StandardCharsets.UTF_8
                )
        )) {

            br.readLine(); // header skip

            String line;

            while ((line = br.readLine()) != null) {

                if (cleanText(line).isBlank()) {
                    continue;
                }

                String[] columns = line.split("\t", -1);

                if (columns.length < 6) {
                    continue;
                }

                String productClassValue = cleanText(columns[0])
                        .replaceAll("[^A-Za-z0-9_]", "");

                String productGroup = cleanText(columns[1]);
                String productName = cleanText(columns[2]);
                String licenseStandard = blankToNull(cleanText(columns[3]));
                String licenseUnit = blankToNull(cleanText(columns[4]));
                Long unitPrice = parseLong(columns[5]);

                if (unitPrice != null) {
                    unitPrice *= 1000;
                }

                if (productName.isBlank()) {
                    continue;
                }

                ProductClass productClass =
                        ProductClass.valueOf(productClassValue);

                boolean exists = productModuleRepository
                        .existsByProductClassAndProductGroupAndProductNameAndLicenseStandard(
                                productClass,
                                productGroup,
                                productName,
                                licenseStandard
                        );

                if (exists) {
                    continue;
                }

                ProductModule productModule = ProductModule.create(
                        productClass,
                        productGroup,
                        productName,
                        licenseStandard,
                        licenseUnit,
                        unitPrice
                );

                productModuleRepository.save(productModule);
            }
        }
    }

    private String blankToNull(String value) {

        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        return trimmed.isBlank()
                ? null
                : trimmed;
    }

    private Long parseLong(String value) {

        if (value == null) {
            return null;
        }

        String normalized = cleanText(value)
                .replaceAll("[^0-9]", "");

        if (normalized.isBlank()) {
            return null;
        }

        return Long.parseLong(normalized);
    }

    private String cleanText(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\u0000", "") // NULL 문자 제거
                .replace("\uFEFF", "") // BOM 제거
                .trim();
    }
}
