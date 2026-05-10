package com.nkia.Orbis.domain.admin.permission.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.AuthErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.admin.permission.dto.request.RoleCreateRequest;
import com.nkia.Orbis.domain.admin.permission.dto.request.RolePermissionRequest;
import com.nkia.Orbis.domain.admin.permission.dto.response.RoleDetailResponse;
import com.nkia.Orbis.domain.admin.permission.dto.response.RoleResponse;
import com.nkia.Orbis.domain.admin.permission.entity.Permission;
import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.permission.repository.PermissionRepository;
import com.nkia.Orbis.domain.admin.permission.repository.RoleRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RoleService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    @Transactional
    public List<RoleResponse> getRoles() {
        return roleRepository.findAll()
                .stream()
                .map(RoleResponse::from)
                .toList();
    }

    @Transactional
    public RoleResponse update(Long roleId, RolePermissionRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ApiException(UserErrorCode.ROLE_NOT_FOUND));

        Set<Permission> permissions = new HashSet<>(
                permissionRepository.findAllById(request.getPermissionIds())
        );

        role.changePermissions(permissions);

        return RoleResponse.from(role);
    }

    @Transactional
    public RoleResponse create(RoleCreateRequest request) {
        if (roleRepository.findByName(request.getName()).isPresent()) {
            throw new ApiException(AuthErrorCode.ROLE_ALREADY_EXISTS);
        }

        Set<Permission> permissions = request.getPermissions().stream()
                .map(permissionItem -> permissionRepository.findByDomainAndAction(
                        permissionItem.getDomain(),
                        permissionItem.getAction()
                ).orElseThrow(() -> new ApiException(AuthErrorCode.PERMISSION_NOT_FOUND)))
                .collect(Collectors.toSet());

        Role role = Role.create(request.getName());
        role.changePermissions(permissions);

        return RoleResponse.from(roleRepository.save(role));
    }

    @Transactional(readOnly = true)
    public RoleDetailResponse getUserPermissionDetail(UUID userId) {
        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        return RoleDetailResponse.from(user);
    }
}
