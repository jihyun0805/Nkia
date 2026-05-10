package com.nkia.Orbis.common.config;

import com.nkia.Orbis.common.filter.JwtAuthenticationFilter;
import com.nkia.Orbis.common.util.JwtProvider;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // 비밀번호 단방향 해시 암호화
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS 설정 활성화
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // REST API이므로 CSRF 보안 비활성화
                .csrf(AbstractHttpConfigurer::disable)
                // 폼 로그인 및 HttpBasic 비활성화
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                // 세션 사용하지 않음 (Stateless)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // URL 권한 설정
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll() // 로그인, refresh는 접근 허용
                        .requestMatchers("/user/signup/admin/**").permitAll() // 관리자 계정 생성만 임시 허용
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll() // Swagger 허용
                        .requestMatchers("/images/**").permitAll()
                        .requestMatchers("/business-card-ocr").permitAll()
                        .requestMatchers("/business-card-ocr/**").permitAll()
                        .requestMatchers("/rfp-summary").permitAll()
                        .requestMatchers("/rfp-summary/**").permitAll()
                        .requestMatchers("/reports/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .anyRequest().authenticated() // 그 외 모든 API는 인증 필요
                )
                // JWT 필터를 UsernamePasswordAuthenticationFilter 전에 추가
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider, redisTemplate),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // CORS 세부 설정 Bean 등록
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 실무에서는 운영 도메인(예: https://my-frontend.com)과 로컬 도메인을 명시합니다.
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
                "https://k14s106.p.ssafy.io"
        ));
        config.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")); // OPTIONS는 Preflight용으로 필수
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization")); // 클라이언트가 헤더의 JWT를 읽을 수 있도록 노출
        config.setAllowCredentials(true); // 쿠키나 인증 정보를 포함한 요청 허용

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config); // 모든 API 경로에 적용
        return source;
    }
}
