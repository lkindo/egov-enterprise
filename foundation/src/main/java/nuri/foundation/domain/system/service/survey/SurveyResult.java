package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 응답 결과 엔티티 (물리 DB 명세 100% 일치)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_rslt")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyResult extends BaseEntity {

    @Id
    @Column(name = "srvy_rspns_id", length = 20)
    private String srvyRspnsId;

    @Column(name = "srvy_id", length = 20, nullable = false)
    private String srvyId;

    @Column(name = "srvy_tmplt_id", length = 20, nullable = false)
    private String srvyTmpltId;

    @Column(name = "srvy_qstn_id", length = 20, nullable = false)
    private String srvyQstnId;

    @Column(name = "srvy_artcl_id", length = 20, nullable = false)
    private String srvyArtclId;

    @Column(name = "rspdnt_ans_cn", length = 4000)
    private String rspdntAnsCn;

    @Column(name = "rspns_nm", length = 100)
    private String rspnsNm;

    @Column(name = "etc_ans_cn", length = 4000)
    private String etcAnsCn;

    public void update(String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        this.rspdntAnsCn = rspdntAnsCn;
        this.rspnsNm = rspnsNm;
        this.etcAnsCn = etcAnsCn;
    }
}
