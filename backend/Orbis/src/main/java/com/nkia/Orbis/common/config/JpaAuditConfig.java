package com.nkia.Orbis.common.config;

import com.nkia.Orbis.common.util.SecurityUtil;
import java.util.Optional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing // JPA Auditing 활성화
public class JpaAuditConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        // 기존의 길었던 로직 대신, SecurityUtil.getCurrentUserId()를 호출하여 결과를 감싸서 반환합니다.
        return () -> Optional.of(SecurityUtil.getCurrentUserId());
    }
}
