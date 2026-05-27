package com.nkia.Orbis.domain.contract.orderreport.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CodeType {
    GN("공공신규: GN"),
    GA("공공증설: GA"),
    JN("3자단가신규: JN"),
    JA("3자단가증설: JA"),
    MN("민간신규: MN"),
    MA("민간증설: MA"),
    GNMA("[공공]신규 고객사 유지보수: GN-MA"),
    GEMA("[공공]기존 유지보수(연장): GE-MA"),
    GLMA("[공공]추가 라이선스 유상전환: GL-MA"),
    MNMA("[민간]신규 고객사 유지보수: MN-MA"),
    MEMA("[민간]기존 유지보수(연장): ME-MA"),
    MLMA("[민간]추가 라이선스 유상전환: ML-MA");

    private final String description;
}
