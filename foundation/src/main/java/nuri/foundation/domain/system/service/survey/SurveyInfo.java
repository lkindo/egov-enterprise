package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문조사 정보 엔티티 (물리 DB 명세 100% 일치)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyInfo extends BaseEntity {

    @Id
    @Column(name = "srvy_id", length = 20)
    private String srvyId;

    @Column(name = "srvy_ttl", length = 100, nullable = false)
    private String srvyTtl;

    @Column(name = "srvy_prps", length = 1000)
    private String srvyPrps;

    @Column(name = "srvy_wrt_gd_cn", length = 4000)
    private String srvyWrtGdCn;

    @Column(name = "srvy_bgng_ymd", length = 8)
    private String srvyBgngYmd;

    @Column(name = "srvy_end_ymd", length = 8)
    private String srvyEndYmd;

    @Column(name = "srvy_trgt", length = 1000)
    private String srvyTrgt;

    @Column(name = "srvy_tmplt_id", length = 20, nullable = false)
    private String srvyTmpltId;

    public void update(String srvyTtl, String srvyPrps, String srvyWrtGdCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgt, String srvyTmpltId) {
        this.srvyTtl = srvyTtl;
        this.srvyPrps = srvyPrps;
        this.srvyWrtGdCn = srvyWrtGdCn;
        this.srvyBgngYmd = srvyBgngYmd;
        this.srvyEndYmd = srvyEndYmd;
        this.srvyTrgt = srvyTrgt;
        this.srvyTmpltId = srvyTmpltId;
    }
}
