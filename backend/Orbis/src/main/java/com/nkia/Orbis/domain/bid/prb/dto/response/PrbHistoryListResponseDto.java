package com.nkia.Orbis.domain.bid.prb.dto.response;

import com.nkia.Orbis.domain.bid.prb.entity.PrbHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbHistoryListResponseDto {

    // 상세 조회를 위한 History 테이블의 PK
    private Long historyId;

    // 변경 이력 버전
    private Integer version;

    // PRB 관리 번호
    private String prbCode;

    // PRB 일자
    private LocalDate prbDate;

    // 추가: 이력이 저장된 시간 (수정 일시)
    private LocalDateTime createdAt;

    public static PrbHistoryListResponseDto from(PrbHistory history) {
        if (history == null) {
            return null;
        }

        return PrbHistoryListResponseDto.builder()
                .historyId(history.getId())
                .version(history.getVersion())
                .prbCode(history.getPrbCode())
                .prbDate(history.getPrbDate())
                .createdAt(history.getCreatedAt())
                .build();
    }
}