package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 항목 정보 Entity
 * 레거시 테이블: NQUSTNRIEM
 */
@Entity
@Table(name = "NQUSTNRIEM")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QustnrIem extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_IEM_ID", length = 20)
    private String qustnrIemId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20, nullable = false)
    private String qestnrQesitmId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "IEM_SN")
    private Long iemSn;

    @Column(name = "IEM_CN", length = 1000, nullable = false)
    private String iemCn;

    @Column(name = "ETC_ANSWER_AT", length = 1)
    private String etcAnswerAt;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    public void update(Long iemSn, String iemCn, String etcAnswerAt) {
        this.iemSn = iemSn;
        this.iemCn = iemCn;
        this.etcAnswerAt = etcAnswerAt;
    }

    public void setLastUpdtPnttm(String pnttm) {
        // Compatibility
    }
}
