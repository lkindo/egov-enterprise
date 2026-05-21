package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_artcl")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrIem extends BaseEntity {

    @Id
    @Column(name = "srvy_artcl_id", length = 20)
    private String srvyItemId;

    @Column(name = "srvy_qstn_id", length = 20)
    private String srvyQitemId;

    @Column(name = "srvy_id", length = 20)
    private String srvyId;

    @Column(name = "artcl_sn")
    private Long srvyItemSn;

    @Column(name = "artcl_cn", length = 2500)
    private String srvyItemCn;

    @Column(name = "etc_ans_yn", length = 1)
    private String etcAnsYn;

    @Column(name = "srvy_tmplt_id", length = 20)
    private String srvyTmplatId;

    public void update(Long srvyItemSn, String srvyItemCn, String etcAnsYn) {
        this.srvyItemSn = srvyItemSn;
        this.srvyItemCn = srvyItemCn;
        this.etcAnsYn = etcAnsYn;
    }
}
