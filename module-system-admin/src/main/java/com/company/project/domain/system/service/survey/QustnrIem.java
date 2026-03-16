package com.company.project.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 항목 엔티티
 * 매핑 테이블: NQUSTNRIEM
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NQUSTNRIEM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrIem extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_IEM_ID", length = 20)
    private String qustnrIemId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20, nullable = false)
    private String qestnrQesitmId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String qestnrTmplatId;

    @Column(name = "IEM_SN")
    private Long iemSn;

    @Column(name = "IEM_CN", length = 1000)
    private String iemCn;

    @Column(name = "ETC_ANSWER_AT", length = 1)
    private String etcAnswerAt;

    public void update(Long iemSn, String iemCn, String etcAnswerAt) {
        this.iemSn = iemSn;
        this.iemCn = iemCn;
        this.etcAnswerAt = etcAnswerAt;
    }
}
