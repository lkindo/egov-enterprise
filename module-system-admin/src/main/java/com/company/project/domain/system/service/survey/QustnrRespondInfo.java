package com.company.project.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 응답 정보 엔티티
 * 매핑 테이블: NQUSTNRRSPNSRESULT
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NQUSTNRRSPNSRESULT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrRespondInfo extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_RSPNS_ID", length = 20)
    private String qestnrQesrspnsId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String qestnrTmplatId;

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
}
