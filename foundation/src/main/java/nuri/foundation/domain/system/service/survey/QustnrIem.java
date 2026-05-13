package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SURVEY_ITEM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrIem extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_IEM_ID", length = 20)
    private String qustnrIemId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String qustnrQesitmId;

    @Column(name = "QUSTNR_ID", length = 20)
    private String qustnrId;

    @Column(name = "ARTCL_SN")
    private Long iemSn;

    @Column(name = "ARTCL_CN", length = 2500)
    private String iemCn;

    @Column(name = "ETC_ANSWER_YN", length = 1)
    private String etcAnswerAt;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qustnrTmplatId;

    public void update(Long iemSn, String iemCn, String etcAnswerAt) {
        this.iemSn = iemSn;
        this.iemCn = iemCn;
        this.etcAnswerAt = etcAnswerAt;
    }
}
