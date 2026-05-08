package com.nkia.Orbis.domain.project.project.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportType;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.project.dto.request.ProjectCreateRequest;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectDetailResponse;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectListResponse;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.entity.ProjectCode;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import io.swagger.v3.oas.annotations.Operation;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final OrderReportRepository orderReportRepository;

    @Transactional
    public Long registerProject(ProjectCreateRequest dto) {
        OrderReport report = validateAndGetOrderReport(dto.getOrderReportId());

        Project project = createProject(report);

        return projectRepository.save(project).getId();
    }

    /**
     * 프로젝트 생성
     */
    private Project createProject(OrderReport report) {
        String pjtNumber = generatePjtNumber(report.getContractDate());
        ProjectCode code = determineProjectCode(report);

        Project project = Project.builder()
                .orderReport(report)
                .code(code)
                .type(code.getType())
                .manager(report.getPm())
                .pjtName(report.getProjectOpportunity().getOpportunityName())
                .totalAmount(report.getTotalAmount())
                .salesRepresentative(report.getPm())
                .build();

        project.assignProjectNumber(pjtNumber);
        return project;
    }

    /**
     * 사업 목록 페이징 조회
     */
    public Page<ProjectListResponse> getProjects(Pageable pageable) {
        Page<Project> projects = projectRepository.findAll(pageable);

        return projects.map(ProjectListResponse::from);
    }

    /**
     * 특정 사업의 상세 정보 조회
     * 연관된 최신 결과보고서 정보가 있을 경우 함께 반환합니다.
     */
    public ProjectDetailResponse getProjectDetail(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));

        ProjectResultReport latestReport = project.getResultReports().stream()
                .max(Comparator.comparing(ProjectResultReport::getCreatedAt))
                .orElse(null);

        return ProjectDetailResponse.from(project, latestReport);
    }

    /**
     * 수주보고서 정보를 바탕으로 ProjectCode를 매핑합니다.
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
}
