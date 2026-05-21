package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_qstn")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrQesitm extends BaseEntity {

    @Id
    @Column(name = "srvy_qstn_id", length = 20)
    private String srvyQitemId;

    @Column(name = "srvy_id", length = 20)
    private String srvyId;

    @Column(name = "qstn_sn")
    private Long srvyQitemSn;

    @Column(name = "qstn_type_cd", length = 20)
    private String srvyQitemTypeCd;

    @Column(name = "qstn_cn", length = 2500)
    private String srvyQitemCn;

    @Column(name = "max_chc_cnt")
    private Integer maxChcCnt;

    @Column(name = "srvy_tmplt_id", length = 20)
    private String srvyTmplatId;

    public void update(Long srvyQitemSn, String srvyQitemTypeCd, String srvyQitemCn, Integer maxChcCnt) {
        this.srvyQitemSn = srvyQitemSn;
        this.srvyQitemTypeCd = srvyQitemTypeCd;
        this.srvyQitemCn = srvyQitemCn;
        this.maxChcCnt = maxChcCnt;
    }
}
