package com.company.project.domain.survey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ?§Î¨∏ ?ëÎãµ Í≤∞Í≥º ?îÌã∞??
 * ?åÏù¥Î∏? NQUSTNRRSPNSRESULT
 */
@Entity
@Table(name = "NQUSTNRRSPNSRESULT")
@Getter
@Setter
@NoArgsConstructor
public class QustnrRespondInfo {

    @Id
    @Column(name = "QUSTNR_RSPNS_RESULT_ID", length = 20)
    private String qestnrQesrspnsId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String qestnrQesitmId;

    @Column(name = "QESTNR_ID", length = 20)
    private String qestnrId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Column(name = "QUSTNR_IEM_ID", length = 20)
    private String qustnrIemId;

    @Column(name = "RESPOND_ANSWER_CN", length = 1000)
    private String respondAnswerCn;

    @Column(name = "RESPOND_NM", length = 50)
    private String respondNm;

    @Column(name = "ETC_ANSWER_CN", length = 1000)
    private String etcAnswerCn;

    @Column(name = "FRST_REGIST_PNTTM")
    private String frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private String lastUpdtPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;
}
