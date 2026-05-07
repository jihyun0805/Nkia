package com.nkia.Orbis.domain.user.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.JwtProvider;
import com.nkia.Orbis.domain.department.entity.Department;
import com.nkia.Orbis.domain.user.dto.request.SignupRequest;
import com.nkia.Orbis.domain.user.dto.request.UserUpdateRequest;
import com.nkia.Orbis.domain.user.dto.response.UserResponse;
import com.nkia.Orbis.domain.user.entity.Role;
import com.nkia.Orbis.domain.user.entity.Status;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;
//    private final DepartmentRepository departmentRepository;
    // TODO: 부서 엔티티 구현후 연동 예정

    public static final String REFRESH_TOKEN = "RefreshToken:";
    public static final String LOGOUT = "logout";

    @Transactional
    public void signupAdmin(SignupRequest request) {
        signup(request, Role.ADMIN);
    }

    @Transactional
    public void signupUser(SignupRequest request) {
        signup(request, Role.USER);
    }

    public void signup(SignupRequest request, Role role) {
        // 1. 이메일 중복 검증
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException(UserErrorCode.EXIST_EMAIL);
        }
        // 사번 중복 검증
        if (userRepository.existsByEmployeeNumber(request.getEmployeeNumber())) {
            throw new ApiException(UserErrorCode.EXIST_EMPLOYEE_NUMBER);
        }

        // Todo: Department 기능 구현 후 임시 코드 변경 예정
//        Department department = departmentRepository.findById(request.getDepartmentId())
//                .orElseThrow(() -> new ApiException(DepartmentErrorCode.DEPARTMENT_NOT_FOUND));
        Department department = Department.builder()
                .id(request.getDepartmentId())
                .build();

        // 2. 비밀번호 단방향 암호화 (Bcrypt)
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // 3. User 엔티티 생성
        User newUser = User.createUser(
                request.getEmployeeNumber(),
                request.getPosition(),
                request.getName(),
                request.getPhone(),
                request.getEmail(),
                encodedPassword,
                role,
                Status.ACTIVE,
                department
        );

        // 4. DB에 저장
        userRepository.save(newUser);
    }

    @Transactional
    public List<UserResponse> getUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse update(UUID userId, UserUpdateRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

//            Department department = departmentRepository.findById(request.getDepartmentId())
//                    .orElseThrow(() -> new ApiException(DepartmentErrorCode.DEPARTMENT_NOT_FOUND));
        Department department = null;

        user.update(
                request.getEmployeeNumber(),
                request.getPosition(),
                request.getName(),
                request.getPhone(),
                request.getRole(),
                request.getStatus(),
                department
        );

        return UserResponse.from(user);

    }
}