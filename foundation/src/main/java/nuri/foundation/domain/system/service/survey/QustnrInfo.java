package nuri.foundation.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문조사 정보 엔티티
 * 매핑 테이블: NQUSTNRINFO (현대화 통합)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SURVEY_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrInfo extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_ID", length = 20)
    private String qustnrId;

    @Column(name = "QUSTNR_SJ", length = 255, nullable = false)
    private String qustnrSj;

    @Column(name = "SRVY_PRPS", length = 1000)
    private String qustnrPurps;

    @Column(name = "QUSTNR_WRITNG_GUIDANCE_CN", length = 2000)
    private String qustnrWritngGuidanceCn;

    @Column(name = "QUSTNR_BGNDE", length = 10)
    private String qustnrBeginDe;

    @Column(name = "QUSTNR_ENDDE", length = 10)
    private String qustnrEndDe;

    @Column(name = "SRVY_TRGT", length = 1000)
    private String qustnrTrget;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String qustnrTmplatId;

    public void update(String qustnrSj, String qustnrPurps, String qustnrWritngGuidanceCn,
            String qustnrBeginDe, String qustnrEndDe, String qustnrTrget, String qustnrTmplatId) {
        this.qustnrSj = qustnrSj;
        this.qustnrPurps = qustnrPurps;
        this.qustnrWritngGuidanceCn = qustnrWritngGuidanceCn;
        this.qustnrBeginDe = qustnrBeginDe;
        this.qustnrEndDe = qustnrEndDe;
        this.qustnrTrget = qustnrTrget;
        this.qustnrTmplatId = qustnrTmplatId;
    }
}
