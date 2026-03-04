package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * ??뿅??臾먮뼗 ?類ｋ궖 Entity
 * ??뉕탢?????뵠?? NQUSTNRRESPONDINFO
 */
@Entity
@Table(name = "NQUSTNRRESPONDINFO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QustnrRespondInfo extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_QESRSPNS_ID", length = 20)
    private String qestnrQesrspnsId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String qestnrTmplatId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20, nullable = false)
    private String qestnrQesitmId;

    @Column(name = "QUSTNR_IEM_ID", length = 20, nullable = false)
    private String qustnrIemId;

    @Column(name = "RESPOND_ANSWER_CN", length = 1000)
    private String respondAnswerCn;

    @Column(name = "RESPOND_NM", length = 50)
    private String respondNm;

    @Column(name = "ETC_ANSWER_CN", length = 1000)
    private String etcAnswerCn;

    public void update(String respondAnswerCn, String respondNm, String etcAnswerCn) {
        this.respondAnswerCn = respondAnswerCn;
        this.respondNm = respondNm;
        this.etcAnswerCn = etcAnswerCn;
    }

    public void setLastUpdtPnttm(String pnttm) {
        // Compatibility
    }

    public void setFrstRegisterPnttm(String pnttm) {
        // Compatibility
    }
}