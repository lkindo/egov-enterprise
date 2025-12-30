package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "SBBSSUMMARY")
@IdClass(BbsSummaryId.class)
public class BbsSummary {

    @Id
    @Column(name = "OCCRRNC_DE", length = 20)
    private String occrrncDe;

    @Id
    @Column(name = "STATS_SE", length = 10)
    private String statsKind;

    @Id
    @Column(name = "DETAIL_STATS_SE", length = 10)
    private String detailStatsKind;

    @Column(name = "CREAT_CO")
    private Long creatCo;

    @Column(name = "TOT_RDCNT")
    private Long totInqireCo;

    @Column(name = "AVRG_RDCNT")
    private Double avrgInqireCo;

    @Column(name = "TOP_INQIRE_BBSCTT_ID", length = 20)
    private String mxmmInqireBbsId;

    @Column(name = "MUMM_INQIRE_BBSCTT_ID", length = 20)
    private String mummInqireBbsId;

    @Column(name = "TOP_NTCR_ID", length = 20)
    private String topNtcepersonId;
}
