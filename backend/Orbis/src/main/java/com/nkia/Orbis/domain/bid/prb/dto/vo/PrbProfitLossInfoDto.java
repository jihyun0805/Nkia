package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.PrbProfitLossInfo;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbProfitLossInfoDto {
    // 전체 사업 금액
    private BigDecimal totalProjectAmount;
    // 당사 사업 금액
    private BigDecimal ourCompanyAmount;
    // 예상 수주율
    private BigDecimal expectedWinRate;
    // 추정 매출액
    private BigDecimal estimatedRevenue;        // 계산된 추정 매출액
    // 추정 영업 이익
    private BigDecimal estimatedOperatingProfit;
    // 추정 매출액
    private BigDecimal estimatedProfitMargin;   // 계산된 추정 이익율

    // Request -> Entity (기존에 만들어둔 Builder 사용)
    public PrbProfitLossInfo toEntity() {
        return PrbProfitLossInfo.builder()
                .totalProjectAmount(totalProjectAmount)
                .ourCompanyAmount(ourCompanyAmount)
                .expectedWinRate(expectedWinRate)
                .estimatedOperatingProfit(estimatedOperatingProfit)
                .build(); // 이 빌더 내부에서 자동으로 추정 매출액/이익율이 계산됨
    }

    // Entity -> Response
    public static PrbProfitLossInfoDto from(PrbProfitLossInfo entity) {
      if (entity == null) {
        return null;
      }
        return PrbProfitLossInfoDto.builder()
                .totalProjectAmount(entity.getTotalProjectAmount())
                .ourCompanyAmount(entity.getOurCompanyAmount())
                .expectedWinRate(entity.getExpectedWinRate())
                .estimatedOperatingProfit(entity.getEstimatedOperatingProfit())
                .estimatedRevenue(entity.getEstimatedRevenue())             // 계산된 값 포함
                .estimatedProfitMargin(entity.getEstimatedProfitMargin())   // 계산된 값 포함
                .build();
    }
}
