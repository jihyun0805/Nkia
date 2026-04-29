package com.nkia.Orbis.domain.auth.dto.request;

import com.nkia.Orbis.domain.user.entity.Position;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SignupRequest {

    @NotBlank(message = "이메일은 필수 입력값입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    private String email;

    @NotBlank(message = "비밀번호는 필수 입력값입니다.")
    // 실무 팁: @Pattern(regexp = "(?=.*[0-9])(?=.*[a-zA-Z])(?=.*\\W)(?=\\S+$).{8,16}",
    // message = "비밀번호는 8~16자 영문 대 소문자, 숫자, 특수문자를 사용하세요.")
    private String password;

    @NotBlank(message = "사번은 필수 입력값입니다.")
    private String employeeNumber;

    @NotNull(message = "직급은 필수 입력값입니다.")
    private Position position;

    @NotBlank(message = "이름은 필수 입력값입니다.")
    private String name;

    private String phone;

    @NotNull(message = "부서는 필수 입력값입니다.")
    private Long departmentId;
}
