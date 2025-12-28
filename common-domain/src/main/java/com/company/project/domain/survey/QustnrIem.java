package com.company.project.domain.survey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 설문 항목 엔티티
 * 테이블: COMTNQUSTNRIEM
 */
@Entity
@Table(name = "COMTNQUSTNRIEM")
@Getter
@Setter
@NoArgsConstructor
public class QustnrIem {

    @Id
    @Column(name = "QUSTNR_IEM_ID", length = 20)
    private String qustnrIemId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String qestnrQesitmId;

    @Column(name = "QESTNR_ID", length = 20)
    private String qestnrId;

    @Column(name = "IEM_SN")
    private Long iemSn;

    @Column(name = "IEM_CN", length = 1000)
    private String iemCn;

    @Column(name = "ETC_ANSWER_AT", length = 1)
    private String etcAnswerAt;

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
