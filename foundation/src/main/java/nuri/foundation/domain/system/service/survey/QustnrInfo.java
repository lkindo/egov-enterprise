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
@Table(name = "TB_SRVY_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrInfo extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_ID", length = 20)
    private String srvyId;

    @Column(name = "QUSTNR_SJ", length = 255, nullable = false)
    private String srvyTtl;

    @Column(name = "SRVY_PRPS", length = 1000)
    private String srvyPrpsCn;

    @Column(name = "QUSTNR_WRITNG_GUIDANCE_CN", length = 2000)
    private String srvyGuidCn;

    @Column(name = "QUSTNR_BGNDE", length = 10)
    private String srvyBgngYmd;

    @Column(name = "QUSTNR_ENDDE", length = 10)
    private String srvyEndYmd;

    @Column(name = "SRVY_TRGT", length = 1000)
    private String srvyTrgtCn;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
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
