package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SRVY_ARTCL")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrIem extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_IEM_ID", length = 20)
    private String srvyItemId;

    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String srvyQitemId;

    @Column(name = "QUSTNR_ID", length = 20)
    private String srvyId;

    @Column(name = "ARTCL_SN")
    private Long srvyItemSn;

    @Column(name = "ARTCL_CN", length = 2500)
    private String srvyItemCn;

    @Column(name = "ETC_ANSWER_YN", length = 1)
    private String etcAnsYn;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String srvyTmplatId;

    public void update(Long srvyItemSn, String srvyItemCn, String etcAnsYn) {
        this.srvyItemSn = srvyItemSn;
        this.srvyItemCn = srvyItemCn;
        this.etcAnsYn = etcAnsYn;
    }
}
