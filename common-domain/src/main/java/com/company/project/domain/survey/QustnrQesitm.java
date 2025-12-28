package com.company.project.domain.survey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 설문 문항 엔티티
 * 테이블: COMTNQUSTNRQESITM
 */
@Entity
@Table(name = "COMTNQUSTNRQESITM")
@Getter
@Setter
@NoArgsConstructor
public class QustnrQesitm {

    @Id
    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String qestnrQesitmId;

    @Column(name = "QESTNR_ID", length = 20)
    private String qestnrId;

    @Column(name = "QESTN_SN")
    private Long qestnSn;

    @Column(name = "QESTN_TY_CODE", length = 1)
    private String qestnTyCode;

    @Column(name = "QESTN_CN", length = 2500)
    private String qestnCn;

    @Column(name = "MXMM_CHOISE_CO")
    private Integer mxmmChoiseCo;

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
