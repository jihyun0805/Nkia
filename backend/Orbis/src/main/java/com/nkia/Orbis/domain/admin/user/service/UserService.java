package com.nkia.Orbis.domain.admin.user.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.DepartmentErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.JwtProvider;
import com.nkia.Orbis.domain.admin.department.entity.Department;
import com.nkia.Orbis.domain.admin.department.repository.DepartmentRepository;
import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.permission.repository.RoleRepository;
import com.nkia.Orbis.domain.admin.user.dto.request.SignupRequest;
import com.nkia.Orbis.domain.admin.user.dto.request.UserUpdateRequest;
import com.nkia.Orbis.domain.admin.user.dto.response.MyInfoResponse;
import com.nkia.Orbis.domain.admin.user.dto.response.UserResponse;
import com.nkia.Orbis.domain.admin.user.entity.Status;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
    private final DepartmentRepository departmentRepository;
    private final RoleRepository roleRepository;

    public static final String REFRESH_TOKEN = "RefreshToken:";
    public static final String LOGOUT = "logout";

    @Transactional
    public void signupAdmin(SignupRequest request) {
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new ApiException(UserErrorCode.ROLE_NOT_FOUND));

        signup(request, Set.of(adminRole));
    }

    @Transactional
    public void signupUser(SignupRequest request) {
        Set<Role> roles = new HashSet<>();

        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            roles.addAll(roleRepository.findAllById(request.getRoleIds()));
        } else {
            Role userRole = roleRepository.findByName("USER")
                    .orElseThrow(() -> new ApiException(UserErrorCode.ROLE_NOT_FOUND));
            roles.add(userRole);
        }

        signup(request, roles);
    }

    public void signup(SignupRequest request, Set<Role> roles) {
        // 이메일 중복 검증
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException(UserErrorCode.EXIST_EMAIL);
        }
        // 사번 중복 검증
        if (userRepository.existsByEmployeeNumber(request.getEmployeeNumber())) {
            throw new ApiException(UserErrorCode.EXIST_EMPLOYEE_NUMBER);
        }

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ApiException(DepartmentErrorCode.DEPARTMENT_NOT_FOUND));

        // 비밀번호 단방향 암호화 (Bcrypt)
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // User 엔티티 생성
        User newUser = User.createUser(
                request.getEmployeeNumber(),
                request.getPosition(),
                request.getName(),
                request.getPhone(),
                request.getEmail(),
                encodedPassword,
                roles,
                Status.ACTIVE,
                department
        );

        // DB에 저장
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

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ApiException(DepartmentErrorCode.DEPARTMENT_NOT_FOUND));

        Set<Role> roles = new HashSet<>();

        // 역할 변경 없으면 기존 유지
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            roles.addAll(roleRepository.findAllById(request.getRoleIds()));
        } else {
            roles.addAll(user.getRoles());
        }

        user.update(
                request.getEmployeeNumber(),
                request.getPosition(),
                request.getName(),
                request.getPhone(),
                roles,
                request.getStatus(),
                department
        );

        return UserResponse.from(user);

    }

    @Transactional
    public UserResponse getUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        return UserResponse.from(user);
    }

    @Transactional
    public MyInfoResponse getMyInfo(UUID userId) {
        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        return MyInfoResponse.from(user);
    }
}