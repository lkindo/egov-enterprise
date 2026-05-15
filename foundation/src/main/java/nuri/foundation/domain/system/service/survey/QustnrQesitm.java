package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SRVY_QSTN")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrQesitm extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String srvyQitemId;

    @Column(name = "QUSTNR_ID", length = 20)
    private String srvyId;

    @Column(name = "QITEM_SN")
    private Long srvyQitemSn;

    @Column(name = "QESTN_TY_CODE", length = 20)
    private String srvyQitemTypeCd;

    @Column(name = "QESTN_CN", length = 2500)
    private String srvyQitemCn;

    @Column(name = "MAX_CHC_CNT")
    private Integer maxChcCnt;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String srvyTmplatId;

    public void update(Long srvyQitemSn, String srvyQitemTypeCd, String srvyQitemCn, Integer maxChcCnt) {
        this.srvyQitemSn = srvyQitemSn;
        this.srvyQitemTypeCd = srvyQitemTypeCd;
        this.srvyQitemCn = srvyQitemCn;
        this.maxChcCnt = maxChcCnt;
    }
}
