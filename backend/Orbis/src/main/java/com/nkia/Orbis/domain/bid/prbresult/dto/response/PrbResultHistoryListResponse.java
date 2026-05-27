package com.nkia.Orbis.domain.bid.prbresult.dto.response;

import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResultHistory;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbResultHistoryListResponse {

    private Long historyId;
    private Long prbResultId;
    private Integer version;
    private LocalDateTime createdAt; // 이력 생성 일시 (수정된 시간)

    public static PrbResultHistoryListResponse from(PrbResultHistory history) {
        if (history == null) {
            return null;
        }

        return PrbResultHistoryListResponse.builder()
                .historyId(history.getId())
                .prbResultId(history.getPrbResultId())
                .version(history.getVersion())
                .createdAt(history.getCreatedAt())
                .build();
    }
}