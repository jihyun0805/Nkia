package com.nkia.Orbis.domain.chatbot.proxy.service;

import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.department.entity.Department;
import com.nkia.Orbis.domain.admin.permission.entity.Permission;
import com.nkia.Orbis.domain.admin.permission.entity.PermissionAction;
import com.nkia.Orbis.domain.admin.permission.entity.PermissionDomain;
import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.user.entity.Position;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.chatbot.proxy.dto.request.ChatbotAiUserContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatbotUserContextService {

    private static final Set<PermissionAction> READABLE_ACTIONS = EnumSet.of(
            PermissionAction.READ,
            PermissionAction.APPROVE,
            PermissionAction.EXPORT,
            PermissionAction.MANAGE
    );
    private static final Set<Position> UNRESTRICTED_POSITIONS = EnumSet.of(Position.HEAD_DIRECTOR);
    private static final Set<Position> DEPARTMENT_SCOPED_POSITIONS = EnumSet.of(Position.TEAM_LEADER);

    private static final String SOURCE_TYPE_ATTACHMENT = "ATTACHMENT";
    private static final String SOURCE_TYPE_PROJECT_OPPORTUNITY = "PROJECT_OPPORTUNITY";
    private static final String SOURCE_TYPE_SALES_ACTIVITY = "SALES_ACTIVITY";
    private static final String SOURCE_TYPE_QUOTATION = "QUOTATION";
    private static final String SOURCE_TYPE_RFP = "RFP";
    private static final String SOURCE_TYPE_RFP_ANALYSIS = "RFP_ANALYSIS";
    private static final String SOURCE_TYPE_PRB = "PRB";
    private static final String SOURCE_TYPE_PRB_RESULT = "PRB_RESULT";
    private static final String SOURCE_TYPE_PROPOSAL = "PROPOSAL";
    private static final String SOURCE_TYPE_BID_RESULT = "BID_RESULT";
    private static final String SOURCE_TYPE_LOST = "LOST";
    private static final String SOURCE_TYPE_ORDER_REPORT = "ORDER_REPORT";
    private static final String SOURCE_TYPE_WON = "WON";
    private static final String SOURCE_TYPE_CONTRACT = "CONTRACT";
    private static final String SOURCE_TYPE_PROJECT = "PROJECT";
    private static final String SOURCE_TYPE_PROJECT_RESULT_REPORT = "PROJECT_RESULT_REPORT";
    private static final String SOURCE_TYPE_MAINTENANCE = "MAINTENANCE";
    private static final String SOURCE_TYPE_MAINTENANCE_QUOTE = "MAINTENANCE_QUOTE";
    private static final String SOURCE_TYPE_CUSTOMER_SUPPORT = "CUSTOMER_SUPPORT";
    private static final String SOURCE_TYPE_POST_SALES = "POST_SALES";
    private static final String SOURCE_TYPE_BILLING = "BILLING";
    private static final String SOURCE_TYPE_LICENSE = "LICENSE";
    private static final String SOURCE_TYPE_COMPANY = "COMPANY";
    private static final String SOURCE_TYPE_CONTACT = "CONTACT";
    private static final String SOURCE_TYPE_MODULE = "MODULE";

    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public ChatbotAiUserContext buildCurrentUserContext() {
        UUID currentUserId = requireCurrentUserId();
        User user = userRepository.findByIdWithRolesAndPermissions(currentUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated chatbot user not found."));

        Set<PermissionDomain> readableDomains = collectReadableDomains(user);
        Set<String> readableSourceTypes = collectReadableSourceTypes(readableDomains);
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .filter(StringUtils::hasText)
                .sorted()
                .toList();

        ChatbotAiUserContext.ChatbotAiUserContextBuilder builder = ChatbotAiUserContext.builder()
                .userId(currentUserId.toString())
                .roles(roleNames)
                .department(formatDepartment(user.getDepartment()))
                .accessibleSourceTypes(new ArrayList<>(readableSourceTypes))
                .metadata(buildMetadata(user));

        if (readableDomains.isEmpty()) {
            builder.accessibleSourceIds(List.of());
            return builder.build();
        }

        AccessScope accessScope = resolveAccessScope(user);
        if (accessScope == AccessScope.UNRESTRICTED) {
            builder.accessibleSourceIds(null);
            return builder.build();
        }

        List<UUID> scopedUserIds = resolveScopedUserIds(user, accessScope);
        Set<String> accessibleSourceIds = collectAccessibleSourceIds(
                readableDomains,
                scopedUserIds
        );
        builder.accessibleSourceIds(new ArrayList<>(accessibleSourceIds));
        return builder.build();
    }

    public String getCurrentUserScopeKey() {
        return requireCurrentUserId().toString();
    }

    private UUID requireCurrentUserId() {
        String rawUserId = SecurityUtil.getAuthenticatedUserIdOrNull();
        if (!StringUtils.hasText(rawUserId)) {
            throw new IllegalStateException("Authenticated chatbot user id is required.");
        }
        return UUID.fromString(rawUserId);
    }

    private Set<PermissionDomain> collectReadableDomains(User user) {
        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .filter(permission -> READABLE_ACTIONS.contains(permission.getAction()))
                .map(Permission::getDomain)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(PermissionDomain.class)));
    }

    private Set<String> collectReadableSourceTypes(Set<PermissionDomain> readableDomains) {
        Set<String> sourceTypes = new LinkedHashSet<>();
        for (PermissionDomain domain : readableDomains) {
            sourceTypes.addAll(mapSourceTypes(domain));
        }
        if (!sourceTypes.isEmpty()) {
            sourceTypes.add(SOURCE_TYPE_ATTACHMENT);
        }
        return sourceTypes;
    }

    private Set<String> collectAccessibleSourceIds(
            Set<PermissionDomain> readableDomains,
            List<UUID> scopedUserIds
    ) {
        Set<String> opportunityKeys = fetchProjectOpportunityKeys(scopedUserIds);
        Set<String> orderReportKeys = fetchOrderReportKeys(scopedUserIds, opportunityKeys);
        Set<String> projectKeys = fetchProjectKeys(scopedUserIds, orderReportKeys);
        Set<String> maintenanceKeys = fetchMaintenanceKeys(scopedUserIds, projectKeys);
        Set<String> rfpKeys = fetchRfpAnalysisKeys(scopedUserIds, opportunityKeys);
        Set<String> prbKeys = fetchPrbKeys(scopedUserIds, opportunityKeys);

        opportunityKeys.addAll(fetchOpportunityKeysForOrderReports(orderReportKeys));
        opportunityKeys.addAll(fetchOpportunityKeysForProjects(projectKeys));
        opportunityKeys.addAll(fetchOpportunityKeysForMaintenances(maintenanceKeys));
        opportunityKeys.addAll(fetchOpportunityKeysForContracts(scopedUserIds, orderReportKeys));

        orderReportKeys.addAll(fetchOrderReportKeys(scopedUserIds, opportunityKeys));
        projectKeys.addAll(fetchProjectKeys(scopedUserIds, orderReportKeys));
        maintenanceKeys.addAll(fetchMaintenanceKeys(scopedUserIds, projectKeys));
        rfpKeys.addAll(fetchRfpAnalysisKeys(scopedUserIds, opportunityKeys));
        prbKeys.addAll(fetchPrbKeys(scopedUserIds, opportunityKeys));

        Set<Long> companyIds = fetchAccessibleCompanyIds(opportunityKeys, orderReportKeys);
        Set<String> accessibleIds = new LinkedHashSet<>();

        addScopedKeys(accessibleIds, SOURCE_TYPE_PROJECT_OPPORTUNITY, opportunityKeys);
        addScopedKeys(accessibleIds, SOURCE_TYPE_WON, opportunityKeys);
        addScopedKeys(accessibleIds, SOURCE_TYPE_ORDER_REPORT, orderReportKeys);
        addScopedKeys(accessibleIds, SOURCE_TYPE_PROJECT, projectKeys);
        addScopedKeys(accessibleIds, SOURCE_TYPE_MAINTENANCE, maintenanceKeys);
        addScopedKeys(accessibleIds, SOURCE_TYPE_RFP_ANALYSIS, rfpKeys);
        addScopedKeys(accessibleIds, SOURCE_TYPE_PRB, prbKeys);

        if (readableDomains.contains(PermissionDomain.COMPANY)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_COMPANY, fetchCompanyKeys(companyIds));
            addScopedKeys(accessibleIds, SOURCE_TYPE_CONTACT, fetchContactKeys(companyIds));
        }
        if (readableDomains.contains(PermissionDomain.PRODUCT_MODULE)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_MODULE, fetchModuleKeys());
        }
        if (readableDomains.contains(PermissionDomain.SALES_ACTIVITY)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_SALES_ACTIVITY, fetchSalesActivityKeys(opportunityKeys));
        }
        if (readableDomains.contains(PermissionDomain.QUOTATION)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_QUOTATION, fetchQuotationKeys(opportunityKeys));
        }
        if (readableDomains.contains(PermissionDomain.RFP_ANALYSE_RESULT)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_RFP_ANALYSIS, fetchRfpRequirementKeys(rfpKeys));
        }
        if (readableDomains.contains(PermissionDomain.PRB_RESULT)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_PRB_RESULT, fetchPrbResultKeys(prbKeys));
        }
        if (readableDomains.contains(PermissionDomain.BID_RESULT)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_BID_RESULT, fetchBidResultKeys(opportunityKeys));
            addScopedKeys(accessibleIds, SOURCE_TYPE_LOST, opportunityKeys);
        }
        if (readableDomains.contains(PermissionDomain.CONTRACT)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_CONTRACT, fetchContractKeys(scopedUserIds, orderReportKeys));
        }
        if (readableDomains.contains(PermissionDomain.PROJECT_RESULT_REPORT)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_PROJECT_RESULT_REPORT, fetchProjectResultReportKeys(projectKeys));
        }
        if (readableDomains.contains(PermissionDomain.MAINTENANCE_QUOTATION)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_MAINTENANCE_QUOTE, fetchMaintenanceQuotationKeys(projectKeys));
        }
        if (readableDomains.contains(PermissionDomain.CUSTOMER_SUPPORT)) {
            Set<String> supportKeys = fetchCustomerSupportKeys(scopedUserIds, maintenanceKeys);
            addScopedKeys(accessibleIds, SOURCE_TYPE_CUSTOMER_SUPPORT, supportKeys);
            addScopedKeys(accessibleIds, SOURCE_TYPE_POST_SALES, supportKeys);
        }
        if (readableDomains.contains(PermissionDomain.BILLING)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_BILLING, fetchBillingKeys(orderReportKeys));
        }
        if (readableDomains.contains(PermissionDomain.LICENSE)) {
            addScopedKeys(accessibleIds, SOURCE_TYPE_LICENSE, fetchLicenseKeys(orderReportKeys));
        }

        return accessibleIds;
    }

    private AccessScope resolveAccessScope(User user) {
        if (hasAdminRole(user) || UNRESTRICTED_POSITIONS.contains(user.getPosition())) {
            return AccessScope.UNRESTRICTED;
        }
        if (user.getDepartment() != null && DEPARTMENT_SCOPED_POSITIONS.contains(user.getPosition())) {
            return AccessScope.DEPARTMENT;
        }
        return AccessScope.OWN;
    }

    private boolean hasAdminRole(User user) {
        return user.getRoles().stream()
                .map(Role::getName)
                .filter(StringUtils::hasText)
                .anyMatch("ADMIN"::equalsIgnoreCase);
    }

    private List<UUID> resolveScopedUserIds(User user, AccessScope accessScope) {
        if (accessScope == AccessScope.OWN || user.getDepartment() == null) {
            return List.of(user.getId());
        }

        TypedQuery<UUID> query = entityManager.createQuery(
                "select u.id from User u where u.department.id = :departmentId",
                UUID.class
        );
        return query.setParameter("departmentId", user.getDepartment().getId()).getResultList();
    }

    private Set<String> fetchProjectOpportunityKeys(List<UUID> scopedUserIds) {
        if (scopedUserIds.isEmpty()) {
            return Set.of();
        }

        List<Object[]> rows = entityManager.createQuery(
                """
                select o.id, o.opportunityCode
                from ProjectOpportunity o
                where o.salesRepresentative.id in :scopedUserIds
                """,
                Object[].class
        ).setParameter("scopedUserIds", scopedUserIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchOpportunityKeysForOrderReports(Set<String> orderReportKeys) {
        List<Long> orderReportIds = extractNumericKeys(orderReportKeys);
        if (orderReportIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct po.id, po.opportunityCode
                from OrderReport o
                join o.projectOpportunity po
                where o.id in :orderReportIds
                """,
                Object[].class
        ).setParameter("orderReportIds", orderReportIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchOpportunityKeysForProjects(Set<String> projectKeys) {
        List<Long> projectIds = extractNumericKeys(projectKeys);
        if (projectIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct po.id, po.opportunityCode
                from Project p
                join p.orderReport o
                join o.projectOpportunity po
                where p.id in :projectIds
                """,
                Object[].class
        ).setParameter("projectIds", projectIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchOpportunityKeysForMaintenances(Set<String> maintenanceKeys) {
        List<Long> maintenanceIds = extractNumericKeys(maintenanceKeys);
        if (maintenanceIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct po.id, po.opportunityCode
                from Maintenance m
                join m.project p
                join p.orderReport o
                join o.projectOpportunity po
                where m.id in :maintenanceIds
                """,
                Object[].class
        ).setParameter("maintenanceIds", maintenanceIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchOpportunityKeysForContracts(List<UUID> scopedUserIds, Set<String> orderReportKeys) {
        if (scopedUserIds.isEmpty() && orderReportKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> orderReportIds = extractNumericKeys(orderReportKeys);
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct po.id, po.opportunityCode
                from Contract c
                join c.orderReport o
                join o.projectOpportunity po
                left join c.salesRepresentative sr
                where sr.id in :scopedUserIds
                   or o.id in :orderReportIds
                """,
                Object[].class
        )
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .setParameter("orderReportIds", orderReportIds.isEmpty() ? List.of(-1L) : orderReportIds)
                .getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchSalesActivityKeys(Set<String> opportunityKeys) {
        if (opportunityKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> opportunityIds = extractNumericKeys(opportunityKeys);
        if (opportunityIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select s.id, null
                from SalesActivity s
                where s.projectOpportunity.id in :opportunityIds
                """,
                Object[].class
        ).setParameter("opportunityIds", opportunityIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchQuotationKeys(Set<String> opportunityKeys) {
        if (opportunityKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> opportunityIds = extractNumericKeys(opportunityKeys);
        if (opportunityIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select q.id, q.quotationCode
                from Quotation q
                where q.projectOpportunity.id in :opportunityIds
                """,
                Object[].class
        ).setParameter("opportunityIds", opportunityIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchRfpAnalysisKeys(List<UUID> scopedUserIds, Set<String> opportunityKeys) {
        if (scopedUserIds.isEmpty() && opportunityKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> opportunityIds = extractNumericKeys(opportunityKeys);
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct r.id, null
                from RfpAnalyzeResult r
                left join r.assignee a
                left join r.projectOpportunity o
                where a.id in :scopedUserIds
                   or o.id in :opportunityIds
                """,
                Object[].class
        )
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .setParameter("opportunityIds", opportunityIds.isEmpty() ? List.of(-1L) : opportunityIds)
                .getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchRfpRequirementKeys(Set<String> rfpKeys) {
        List<Long> rfpIds = extractNumericKeys(rfpKeys);
        if (rfpIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select rr.id, rr.requirementCode
                from RfpRequirement rr
                where rr.rfpAnalyzeResult.id in :rfpIds
                """,
                Object[].class
        ).setParameter("rfpIds", rfpIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchPrbKeys(List<UUID> scopedUserIds, Set<String> opportunityKeys) {
        if (scopedUserIds.isEmpty() && opportunityKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> opportunityIds = extractNumericKeys(opportunityKeys);
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct p.id, null
                from Prb p
                left join p.salesRepresentative s
                left join p.projectOpportunity o
                where s.id in :scopedUserIds
                   or o.id in :opportunityIds
                """,
                Object[].class
        )
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .setParameter("opportunityIds", opportunityIds.isEmpty() ? List.of(-1L) : opportunityIds)
                .getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchPrbResultKeys(Set<String> prbKeys) {
        List<Long> prbIds = extractNumericKeys(prbKeys);
        if (prbIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select pr.id, null
                from PrbResult pr
                where pr.prb.id in :prbIds
                """,
                Object[].class
        ).setParameter("prbIds", prbIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchProposalKeys(Set<String> opportunityKeys) {
        return Set.of();
    }

    private Set<String> fetchBidResultKeys(Set<String> opportunityKeys) {
        List<Long> opportunityIds = extractNumericKeys(opportunityKeys);
        if (opportunityIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select b.id, null
                from BidResult b
                where b.projectOpportunity.id in :opportunityIds
                """,
                Object[].class
        ).setParameter("opportunityIds", opportunityIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchOrderReportKeys(List<UUID> scopedUserIds, Set<String> opportunityKeys) {
        if (scopedUserIds.isEmpty() && opportunityKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> opportunityIds = extractNumericKeys(opportunityKeys);
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct o.id, o.orderReportCode
                from OrderReport o
                left join o.pm pm
                left join o.projectOpportunity po
                where pm.id in :scopedUserIds
                   or po.id in :opportunityIds
                """,
                Object[].class
        )
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .setParameter("opportunityIds", opportunityIds.isEmpty() ? List.of(-1L) : opportunityIds)
                .getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchContractKeys(List<UUID> scopedUserIds, Set<String> orderReportKeys) {
        if (scopedUserIds.isEmpty() && orderReportKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> orderReportIds = extractNumericKeys(orderReportKeys);
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct c.id, null
                from Contract c
                left join c.salesRepresentative sr
                left join c.orderReport o
                where sr.id in :scopedUserIds
                   or o.id in :orderReportIds
                """,
                Object[].class
        )
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .setParameter("orderReportIds", orderReportIds.isEmpty() ? List.of(-1L) : orderReportIds)
                .getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchProjectKeys(List<UUID> scopedUserIds, Set<String> orderReportKeys) {
        if (scopedUserIds.isEmpty() && orderReportKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> orderReportIds = extractNumericKeys(orderReportKeys);
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct p.id, p.pjtNumber, p.code
                from Project p
                left join p.manager m
                left join p.salesRepresentative sr
                left join p.orderReport o
                where m.id in :scopedUserIds
                   or sr.id in :scopedUserIds
                   or o.id in :orderReportIds
                """,
                Object[].class
        )
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .setParameter("orderReportIds", orderReportIds.isEmpty() ? List.of(-1L) : orderReportIds)
                .getResultList();

        Set<String> keys = new LinkedHashSet<>();
        for (Object[] row : rows) {
            addKey(keys, row[0]);
            addKey(keys, row[1]);
            addKey(keys, row[2]);
        }
        return keys;
    }

    private Set<String> fetchProjectResultReportKeys(Set<String> projectKeys) {
        List<Long> projectIds = extractNumericKeys(projectKeys);
        if (projectIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select pr.id, null
                from ProjectResultReport pr
                where pr.project.id in :projectIds
                """,
                Object[].class
        ).setParameter("projectIds", projectIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchMaintenanceKeys(List<UUID> scopedUserIds, Set<String> projectKeys) {
        if (scopedUserIds.isEmpty() && projectKeys.isEmpty()) {
            return Set.of();
        }
        List<Long> projectIds = extractNumericKeys(projectKeys);
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct m.id, null
                from Maintenance m
                left join m.project p
                left join m.salesRep sr
                left join m.managerPrimary mp
                left join m.managerSecondary ms
                left join m.regularPm rpm
                where p.id in :projectIds
                   or sr.id in :scopedUserIds
                   or mp.id in :scopedUserIds
                   or ms.id in :scopedUserIds
                   or rpm.id in :scopedUserIds
                """,
                Object[].class
        )
                .setParameter("projectIds", projectIds.isEmpty() ? List.of(-1L) : projectIds)
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchMaintenanceQuotationKeys(Set<String> projectKeys) {
        List<Long> projectIds = extractNumericKeys(projectKeys);
        if (projectIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select mq.id, mq.refNo
                from MaintenanceQuotation mq
                where mq.project.id in :projectIds
                """,
                Object[].class
        ).setParameter("projectIds", projectIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchCustomerSupportKeys(List<UUID> scopedUserIds, Set<String> maintenanceKeys) {
        List<Long> maintenanceIds = extractNumericKeys(maintenanceKeys);
        if (scopedUserIds.isEmpty() && maintenanceIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select distinct cs.id, null
                from CustomerSupport cs
                left join cs.maintenance m
                left join cs.registrant r
                where m.id in :maintenanceIds
                   or r.id in :scopedUserIds
                """,
                Object[].class
        )
                .setParameter("maintenanceIds", maintenanceIds.isEmpty() ? List.of(-1L) : maintenanceIds)
                .setParameter("scopedUserIds", scopedUserIds.isEmpty() ? List.of(UUID.randomUUID()) : scopedUserIds)
                .getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchBillingKeys(Set<String> orderReportKeys) {
        List<Long> orderReportIds = extractNumericKeys(orderReportKeys);
        if (orderReportIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select b.id, null
                from Billing b
                where b.orderReport.id in :orderReportIds
                """,
                Object[].class
        ).setParameter("orderReportIds", orderReportIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchLicenseKeys(Set<String> orderReportKeys) {
        List<Long> orderReportIds = extractNumericKeys(orderReportKeys);
        if (orderReportIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                """
                select l.id, null
                from License l
                where l.orderReport.id in :orderReportIds
                """,
                Object[].class
        ).setParameter("orderReportIds", orderReportIds).getResultList();
        return toKeySet(rows);
    }

    private Set<Long> fetchAccessibleCompanyIds(Set<String> opportunityKeys, Set<String> orderReportKeys) {
        Set<Long> companyIds = new LinkedHashSet<>();
        List<Long> opportunityIds = extractNumericKeys(opportunityKeys);
        if (!opportunityIds.isEmpty()) {
            companyIds.addAll(entityManager.createQuery(
                    """
                    select distinct c.id
                    from ProjectOpportunity o
                    join o.customerCompany c
                    where o.id in :opportunityIds
                    """,
                    Long.class
            ).setParameter("opportunityIds", opportunityIds).getResultList());
        }

        List<Long> orderReportIds = extractNumericKeys(orderReportKeys);
        if (!orderReportIds.isEmpty()) {
            companyIds.addAll(entityManager.createQuery(
                    """
                    select distinct c.id
                    from OrderReport o
                    join o.contractCounterpartCompany c
                    where o.id in :orderReportIds
                    """,
                    Long.class
            ).setParameter("orderReportIds", orderReportIds).getResultList());
            companyIds.addAll(entityManager.createQuery(
                    """
                    select distinct c.id
                    from OrderReport o
                    join o.finalCustomerCompany c
                    where o.id in :orderReportIds
                    """,
                    Long.class
            ).setParameter("orderReportIds", orderReportIds).getResultList());
        }
        return companyIds;
    }

    private Set<String> fetchCompanyKeys(Set<Long> companyIds) {
        if (companyIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                "select c.id, c.code from Company c where c.id in :companyIds",
                Object[].class
        ).setParameter("companyIds", companyIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchContactKeys(Set<Long> companyIds) {
        if (companyIds.isEmpty()) {
            return Set.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                "select cm.id, cm.email from CompanyManager cm where cm.company.id in :companyIds",
                Object[].class
        ).setParameter("companyIds", companyIds).getResultList();
        return toKeySet(rows);
    }

    private Set<String> fetchModuleKeys() {
        List<Object[]> rows = entityManager.createQuery(
                "select pm.productName, pm.productClass from ProductModule pm",
                Object[].class
        ).getResultList();
        return toKeySet(rows);
    }

    private Set<String> mapSourceTypes(PermissionDomain domain) {
        return switch (domain) {
            case PROJECT_OPPORTUNITY -> Set.of(SOURCE_TYPE_PROJECT_OPPORTUNITY);
            case COMPANY -> Set.of(SOURCE_TYPE_COMPANY, SOURCE_TYPE_CONTACT);
            case SALES_ACTIVITY -> Set.of(SOURCE_TYPE_SALES_ACTIVITY);
            case SALES_ACTIVITY_REQUEST -> Set.of();
            case QUOTATION -> Set.of(SOURCE_TYPE_QUOTATION);
            case RFP_ANALYSE_RESULT -> Set.of(SOURCE_TYPE_RFP, SOURCE_TYPE_RFP_ANALYSIS);
            case PRB -> Set.of(SOURCE_TYPE_PRB);
            case PRB_RESULT -> Set.of(SOURCE_TYPE_PRB_RESULT);
            case BID_RESULT -> Set.of(SOURCE_TYPE_BID_RESULT, SOURCE_TYPE_LOST);
            case ORDER_REPORT -> Set.of(SOURCE_TYPE_ORDER_REPORT, SOURCE_TYPE_WON);
            case CONTRACT -> Set.of(SOURCE_TYPE_CONTRACT);
            case LICENSE -> Set.of(SOURCE_TYPE_LICENSE);
            case PROJECT, PROJECT_RESULT, PROJECT_RESULT_REPORT -> Set.of(
                    SOURCE_TYPE_PROJECT,
                    SOURCE_TYPE_PROJECT_RESULT_REPORT
            );
            case BILLING -> Set.of(SOURCE_TYPE_BILLING);
            case MAINTENANCE -> Set.of(SOURCE_TYPE_MAINTENANCE);
            case MAINTENANCE_QUOTATION -> Set.of(SOURCE_TYPE_MAINTENANCE_QUOTE);
            case CUSTOMER_SUPPORT -> Set.of(SOURCE_TYPE_CUSTOMER_SUPPORT, SOURCE_TYPE_POST_SALES);
            case PRODUCT_MODULE -> Set.of(SOURCE_TYPE_MODULE);
            case DEPARTMENT, WORKFLOW_TEMPLATE, WORKFLOW, PERMISSION, USER -> Set.of();
        };
    }

    private Map<String, String> buildMetadata(User user) {
        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("position", user.getPosition().name());
        metadata.put("employeeNumber", user.getEmployeeNumber());
        if (user.getDepartment() != null) {
            metadata.put("departmentId", String.valueOf(user.getDepartment().getId()));
            if (StringUtils.hasText(user.getDepartment().getHeadquarters())) {
                metadata.put("headquarters", user.getDepartment().getHeadquarters());
            }
            if (StringUtils.hasText(user.getDepartment().getTeam())) {
                metadata.put("team", user.getDepartment().getTeam());
            }
        }
        return metadata;
    }

    private String formatDepartment(Department department) {
        if (department == null) {
            return null;
        }
        return java.util.stream.Stream.of(
                        department.getHeadquarters(),
                        department.getTeam()
                )
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" / "));
    }

    private Set<String> toKeySet(List<Object[]> rows) {
        Set<String> keys = new LinkedHashSet<>();
        for (Object[] row : rows) {
            if (row.length > 0) {
                addKey(keys, row[0]);
            }
            if (row.length > 1) {
                addKey(keys, row[1]);
            }
        }
        return keys;
    }

    private void addKey(Set<String> keys, Object value) {
        if (value == null) {
            return;
        }
        String text = value.toString().trim();
        if (!text.isEmpty()) {
            keys.add(text);
        }
    }

    private void addScopedKeys(Set<String> keys, String sourceType, Collection<String> rawKeys) {
        if (!StringUtils.hasText(sourceType) || rawKeys == null) {
            return;
        }
        rawKeys.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(rawKey -> sourceType + "::" + rawKey)
                .forEach(keys::add);
    }

    private List<Long> extractNumericKeys(Collection<String> keys) {
        return keys.stream()
                .filter(StringUtils::hasText)
                .map(value -> {
                    try {
                        return Long.valueOf(value);
                    } catch (NumberFormatException ignored) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private enum AccessScope {
        OWN,
        DEPARTMENT,
        UNRESTRICTED,
    }
}
