package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 설문 응답 결과 정보 Entity
 * 레거시 테이블: NQUSTNRRSPNSRESULT
 */
@Entity
@Table(name = "NQUSTNRRSPNSRESULT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QustnrRespondInfo extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_RSPNS_RESULT_ID", length = 20)
    private String qestnrQesrspnsId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20, nullable = false)
    private String qestnrQesitmId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
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

    @Builder
    public QustnrRespondInfo(String qestnrQesrspnsId, String qestnrQesitmId, String qestnrId,
                            String qestnrTmplatId, String qustnrIemId, String respondAnswerCn,
                            String respondNm, String etcAnswerCn) {
        this.qestnrQesrspnsId = qestnrQesrspnsId;
        this.qestnrQesitmId = qestnrQesitmId;
        this.qestnrId = qestnrId;
        this.qestnrTmplatId = qestnrTmplatId;
        this.qustnrIemId = qustnrIemId;
        this.respondAnswerCn = respondAnswerCn;
        this.respondNm = respondNm;
        this.etcAnswerCn = etcAnswerCn;
    }
}
