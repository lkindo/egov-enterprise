package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SURVEY_QITEM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrQesitm extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String qustnrQesitmId;

    @Column(name = "QUSTNR_ID", length = 20)
    private String qustnrId;

    @Column(name = "QITEM_SN")
    private Long qestnSn;

    @Column(name = "QESTN_TY_CODE", length = 20)
    private String qestnTyCode;

    @Column(name = "QESTN_CN", length = 2500)
    private String qestnCn;

    @Column(name = "MAX_CHC_CNT")
    private Integer mxmmChoiseCo;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qustnrTmplatId;

    public void update(Long qestnSn, String qestnTyCode, String qestnCn, Integer mxmmChoiseCo) {
        this.qestnSn = qestnSn;
        this.qestnTyCode = qestnTyCode;
        this.qestnCn = qestnCn;
        this.mxmmChoiseCo = mxmmChoiseCo;
    }
}
