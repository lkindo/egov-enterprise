package nuri.foundation.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 응답 정보 엔티티
 * 매핑 테이블: NQUSTNRRSPNSRESULT
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SURVEY_RESULT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrRespondInfo extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_RSPNS_ID", length = 20)
    private String srvyRspdId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String srvyId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String srvyTmplatId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20, nullable = false)
    private String srvyQitemId;

    @Column(name = "QUSTNR_IEM_ID", length = 20, nullable = false)
    private String srvyItemId;

    @Column(name = "RSPDNT_ANS_CN", length = 1000)
    private String rspdAnsCn;

    @Column(name = "RESPOND_NM", length = 50)
    private String rspdNm;

    @Column(name = "ETC_ANS_CN", length = 1000)
    private String etcAnsCn;

    public void update(String rspdAnsCn, String rspdNm, String etcAnsCn) {
        this.rspdAnsCn = rspdAnsCn;
        this.rspdNm = rspdNm;
        this.etcAnsCn = etcAnsCn;
    }
}
