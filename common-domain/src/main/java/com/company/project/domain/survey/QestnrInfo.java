package com.company.project.domain.survey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 설문 정보 엔티티
 * 테이블: COMTNQESTNRINFO
 */
@Entity
@Table(name = "COMTNQESTNRINFO")
@Getter
@Setter
@NoArgsConstructor
public class QestnrInfo {

    @Id
    @Column(name = "QESTNR_ID", length = 20)
    private String qestnrId;

    @Column(name = "QUSTNR_SJ", length = 255)
    private String qestnrSj;

    @Column(name = "QUSTNR_PURPS", length = 1000)
    private String qestnrPurps;

    @Column(name = "QUSTNR_WRITNG_GUIDANCE_CN", length = 2000)
    private String qestnrWritngGuidanceCn;

    @Column(name = "QUSTNR_BGNDE", length = 20)
    private String qestnrBeginDe;

    @Column(name = "QUSTNR_ENDDE", length = 20)
    private String qestnrEndDe;

    @Column(name = "QUSTNR_TRGET", length = 1000)
    private String qestnrTrget;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Column(name = "FRST_REGIST_PNTTM")
    private String frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private String lastUpdtPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;
}
