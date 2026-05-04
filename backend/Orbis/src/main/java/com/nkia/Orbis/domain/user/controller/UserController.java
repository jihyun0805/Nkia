package com.nkia.Orbis.domain.user.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.user.dto.request.SignupRequest;
import com.nkia.Orbis.domain.user.dto.response.UserResponse;
import com.nkia.Orbis.domain.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Tag(name = "User", description = "계정 관리 API")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Admin 회원가입")
    @SecurityRequirements()
    @PostMapping("/signup/admin")
    public ResponseEntity<ApiResponse<String>> signupAdmin(@Valid @RequestBody SignupRequest request) {

        // 서비스 계층에 비즈니스 로직 위임
        userService.signupAdmin(request);

        // 회원가입 성공 응답 반환 (성공 시 보통 데이터 본문 없이 메시지만 내려주거나 null 처리)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("회원가입이 완료되었습니다."));
    }

    @Operation(summary = "User 계정 생성")
    @PostMapping("/signup/user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> signupUser(@Valid @RequestBody SignupRequest request) {

        // 서비스 계층에 비즈니스 로직 위임
        userService.signupUser(request);

        // 회원가입 성공 응답 반환 (성공 시 보통 데이터 본문 없이 메시지만 내려주거나 null 처리)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("회원가입이 완료되었습니다."));
    }

    @Operation(summary = "사용자 목록 조회")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsers() {
        List<UserResponse> response = userService.getUsers();

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
