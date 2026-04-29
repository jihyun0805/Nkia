package com.nkia.Orbis.domain.project.project.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
//import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.project.dto.request.ProjectCreateRequest;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.entity.ProjectCode;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepository;
//    private final OrderReportRepository orderReportRepository;

    @Transactional
    public void registerProject(ProjectCreateRequest dto) {
//        OrderReport report = validateAndGetOrderReport(dto.getOrderReportId());

//        ProjectCode code = determineProjectCode(report);
//
//        Project project = createProject(code, report);
//
//        projectRepository.save(project);
    }

    /**
     * 수주보고서 조회 및 중복 검증
     */
//    private OrderReport validateAndGetOrderReport(Long orderReportId) {
//        OrderReport report = orderReportRepository.findById(orderReportId)
//                .orElseThrow(() -> new ApiException(ProjectErrorCode.ORDER_REPORT_NOT_FOUND));
//
//        if (projectRepository.existsByOrderReport(report)) {
//            throw new ApiException(ProjectErrorCode.PROJECT_ALREADY_REGISTERED);
//        }
//        return report;
//    }

    /**
     * 수주보고서 정보로부터 사업 코드 결정
     */
    private ProjectCode determineProjectCode(OrderReport report) {
        // 용역 타입이면 SERVICE 코드 사용
//        if ("용역".equals(report.getProjectType())) {
//            return ProjectCode.SERVICE;
//        }
//
//        // TODO: 추후 변경 필요
//        String codeValue = extractCode(report.getSalesCategory());

        if ("용역".equals("용역")) {
            return ProjectCode.SERVICE;
        }

        // TODO: 추후 변경 필요
        String codeValue = extractCode("코드: JA");


        return ProjectCode.fromValue(codeValue);
    }

    /**
     * 프로젝트 생성
     */
    private Project createProject(ProjectCode code, OrderReport report) {
        LocalDate contractDate = LocalDate.now(); // TODO: report.getContractDate() 사용
        String pjtNumber = generatePjtNumber(contractDate);

        Project project = Project.builder()
                .code(code)
                .type(code.getType())
                .orderReport(report)
                .build();

        project.assignProjectNumber(pjtNumber);
        return project;
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
     * 문자열에서 맨 뒤의 코드를 뽑아내는 헬퍼 메서드
     */
    private String extractCode(String fullString) {
        if (fullString == null || !fullString.contains(":")) {
            return "";
        }
        return fullString.substring(fullString.lastIndexOf(":") + 1).trim();
    }
}
