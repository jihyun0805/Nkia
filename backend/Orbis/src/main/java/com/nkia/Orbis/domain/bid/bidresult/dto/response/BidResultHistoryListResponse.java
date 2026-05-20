package com.nkia.Orbis.domain.bid.bidresult.dto.response;

import com.nkia.Orbis.domain.bid.bidresult.entity.BidOutcome;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResultHistory;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class BidResultHistoryListResponse {

    private Long historyId;
    private Long bidResultId;
    private Integer version;
    private BidOutcome bidOutcome;
    private LocalDateTime createdAt; // 이력 생성 일시 (수정된 시간)

    public static BidResultHistoryListResponse from(BidResultHistory history) {
        if (history == null) {
            return null;
        }

        return BidResultHistoryListResponse.builder()
                .historyId(history.getId())
                .bidResultId(history.getBidResultId())
                .version(history.getVersion())
                .bidOutcome(history.getBidOutcome())
                .createdAt(history.getCreatedAt())
                .build();
    }
}