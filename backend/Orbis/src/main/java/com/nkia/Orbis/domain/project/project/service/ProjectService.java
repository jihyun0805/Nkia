package com.nkia.Orbis.domain.project.project.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportType;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.project.dto.request.ProjectCombinedUpdateRequest;
import com.nkia.Orbis.domain.project.project.dto.request.ProjectCreateRequest;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectDetailResponse;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectCreateResponse;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectListResponse;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.entity.ProjectCode;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final OrderReportRepository orderReportRepository;
    private final UserRepository userRepository;
    private final UploadFileRepository uploadFileRepository;

    /**
     * 사업 등록
     */
    @Transactional
    public ProjectCreateResponse registerProject(ProjectCreateRequest dto) {
        OrderReport report = validateAndGetOrderReport(dto.getOrderReportId());

        Project project = createProject(report);
        Project savedProject = projectRepository.save(project);

        return ProjectCreateResponse.from(savedProject);
    }

    /**
     * 사업 생성
     */
    @Transactional
    private Project createProject(OrderReport report) {
        String pjtNumber = generatePjtNumber(LocalDate.now());
        ProjectCode code = determineProjectCode(report);

        Project project = Project.builder()
                .orderReport(report)
                .code(code)
                .type(code.getType())
                .pjtName(report.getProjectOpportunity().getOpportunityName())
                .totalAmount(report.getTotalAmount())
                .salesRepresentative(report.getPm())
                .build();

        project.assignProjectNumber(pjtNumber);
        return project;
    }

    /**
     * 사업 목록 전체 조회
     */
    public List<ProjectListResponse> getProjects() {
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        return projects.stream()
                .map(ProjectListResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 특정 사업의 상세 정보 조회
     * 연관된 최신 결과보고서 정보가 있을 경우 함께 반환
     */
    public ProjectDetailResponse getProjectDetail(Long projectId) {
        Project project = getProject(projectId);
        return getProjectDetail(project);
    }

    /**
     * 특정 사업의 상세 정보 조회
     */
    public ProjectDetailResponse getProjectDetail(Project project) {
        ProjectResultReport latestReport = project.getResultReports().stream()
                .max(Comparator.comparing(ProjectResultReport::getCreatedAt))
                .orElse(null);

        return ProjectDetailResponse.from(project, latestReport);
    }

    /**
     * 사업의 기본 정보 수정
     */
    @Transactional
    public void updateProject(Project project, ProjectCombinedUpdateRequest request) {
        User manager = getUser(request.getManagerId());
        User salesRep = getUser(request.getSalesRepresentativeId());

        project.updateProjectInfo(request.getStartDate(), request.getEndDate(), manager, salesRep);
    }

    /**
     * 사업 삭제
     */
    @Transactional
    public void deleteProject(Long projectId) {
        Project project = getProject(projectId);
        project.delete();
    }

    /**
     * ID로 사업 엔티티 조회
     */
    public Project getProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));
    }

    /**
     * 수주보고서 정보를 바탕으로 ProjectCode를 매핑
     */
    private ProjectCode determineProjectCode(OrderReport report) {
        if (report.getType() == OrderReportType.SERVICE) {
            return ProjectCode.SERVICE;
        }

        try {
            return ProjectCode.valueOf(report.getCodeType().name());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ApiException(ProjectErrorCode.INVALID_PROJECT_CODE);
        }
    }

    /**
     * 수주보고서 조회 및 중복 검증
     */
    private OrderReport validateAndGetOrderReport(Long orderReportId) {
        OrderReport report = orderReportRepository.findById(orderReportId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.ORDER_REPORT_NOT_FOUND));

        if (projectRepository.existsByOrderReport(report)) {
            throw new ApiException(ProjectErrorCode.PROJECT_ALREADY_REGISTERED);
        }
        return report;
    }

    /**
     * PJT 번호 생성 로직: YYYYMM + Sequence(01, 02...)
     */
    private String generatePjtNumber(LocalDate date) {
        // 1. 연도와 월 추출 (예: 202604)
        String yearMonthStr = date.format(DateTimeFormatter.ofPattern("yyyyMM"));
        int prefixLength = yearMonthStr.length();

        // 2. DB에서 해당 월의 마지막 번호를 조회
        return projectRepository.findLastPjtNumberByMonth(yearMonthStr)
                .map(lastNum -> {
                    String sequenceStr = lastNum.substring(prefixLength);
                    int nextSeq = Integer.parseInt(sequenceStr) + 1;
                    return yearMonthStr + String.format("%02d", nextSeq);
                })
                .orElse(yearMonthStr + "01");
    }

    /**
     * UUID로 User 엔티티 조회
     */
    private User getUser(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }
}
