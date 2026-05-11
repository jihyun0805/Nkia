package com.nkia.Orbis.domain.admin.department.init;

import com.nkia.Orbis.domain.admin.department.entity.Department;
import com.nkia.Orbis.domain.admin.department.repository.DepartmentRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DepartmentInitializer implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;

    @Override
    @Transactional
    public void run(String... args) {

        List<DepartmentData> departments = List.of(
                new DepartmentData("영업1본부", "영업1팀"),
                new DepartmentData("영업2본부", "영업2팀"),

                new DepartmentData("IoT사업본부", "IoT사업팀"),

                new DepartmentData("사업본부", "사업수행팀"),
                new DepartmentData("사업본부", "사업지원팀"),
                new DepartmentData("사업본부", "기술지원팀"),

                new DepartmentData("연구소", "연구1팀"),
                new DepartmentData("연구소", "연구2팀"),
                new DepartmentData("연구소", "연구3팀"),
                new DepartmentData("연구소", "AI1팀"),

                new DepartmentData("신사업본부", "AI혁신팀"),
                new DepartmentData("신사업본부", "신사업추진팀"),
                new DepartmentData("신사업본부", "정보보안팀"),

                new DepartmentData("글로벌사업본부", "대외협력팀"),

                new DepartmentData("경영지원본부", "경영지원팀"),
                new DepartmentData("경영지원본부", "품질혁신팀"),
                new DepartmentData("경영지원본부", "솔루션컨설팅팀")
        );

        for (DepartmentData data : departments) {

            boolean exists = departmentRepository.existsByHeadquartersAndTeam(
                    data.headquarters(),
                    data.team()
            );

            if (!exists) {
                departmentRepository.save(
                        Department.create(
                                data.headquarters(),
                                data.team()
                        )
                );
            }
        }
    }

    private record DepartmentData(
            String headquarters,
            String team
    ) {
    }
}
