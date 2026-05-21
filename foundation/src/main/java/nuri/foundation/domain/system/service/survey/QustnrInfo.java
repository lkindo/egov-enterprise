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
@Table(name = "tb_srvy_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrInfo extends BaseEntity {

    @Id
    @Column(name = "srvy_id", length = 20)
    private String srvyId;

    @Column(name = "srvy_ttl", length = 100, nullable = false)
    private String srvyTtl;

    @Column(name = "srvy_prps", length = 1000)
    private String srvyPrpsCn;

    @Column(name = "srvy_wrt_gd_cn", length = 4000)
    private String srvyGuidCn;

    @Column(name = "srvy_bgng_ymd", length = 8)
    private String srvyBgngYmd;

    @Column(name = "srvy_end_ymd", length = 8)
    private String srvyEndYmd;

    @Column(name = "srvy_trgt", length = 1000)
    private String srvyTrgtCn;

    @Column(name = "srvy_tmplt_id", length = 20, nullable = false)
    private String srvyTmplatId;

    public void update(String srvyTtl, String srvyPrpsCn, String srvyGuidCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgtCn, String srvyTmplatId) {
        this.srvyTtl = srvyTtl;
        this.srvyPrpsCn = srvyPrpsCn;
        this.srvyGuidCn = srvyGuidCn;
        this.srvyBgngYmd = srvyBgngYmd;
        this.srvyEndYmd = srvyEndYmd;
        this.srvyTrgtCn = srvyTrgtCn;
        this.srvyTmplatId = srvyTmplatId;
    }
}
