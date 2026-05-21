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
@Table(name = "tb_srvy_rslt")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrRespondInfo extends BaseEntity {

    @Id
    @Column(name = "qustnr_rspns_id", length = 20)
    private String srvyRspdId;

    @Column(name = "qestnr_id", length = 20, nullable = false)
    private String srvyId;

    @Column(name = "qustnr_tmplat_id", length = 20, nullable = false)
    private String srvyTmplatId;

    @Column(name = "qustnr_qesitm_id", length = 20, nullable = false)
    private String srvyQitemId;

    @Column(name = "qustnr_iem_id", length = 20, nullable = false)
    private String srvyItemId;

    @Column(name = "rspdnt_ans_cn", length = 1000)
    private String rspdAnsCn;

    @Column(name = "respond_nm", length = 50)
    private String rspdNm;

    @Column(name = "etc_ans_cn", length = 1000)
    private String etcAnsCn;

    public void update(String rspdAnsCn, String rspdNm, String etcAnsCn) {
        this.rspdAnsCn = rspdAnsCn;
        this.rspdNm = rspdNm;
        this.etcAnsCn = etcAnsCn;
    }
}
