package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 항목 엔티티 (물리 DB 명세 100% 일치)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_artcl")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyArticle extends BaseEntity {

    @Id
    @Column(name = "srvy_artcl_id", length = 20)
    private String srvyArtclId;

    @Column(name = "srvy_qstn_id", length = 20)
    private String srvyQstnId;

    @Column(name = "srvy_id", length = 20)
    private String srvyId;

    @Column(name = "artcl_sn")
    private Long artclSn;

    @Column(name = "artcl_cn", length = 4000)
    private String artclCn;

    @Column(name = "etc_ans_yn", length = 1)
    private String etcAnsYn;

    @Column(name = "srvy_tmplt_id", length = 20)
    private String srvyTmpltId;

    public void update(Long artclSn, String artclCn, String etcAnsYn) {
        this.artclSn = artclSn;
        this.artclCn = artclCn;
        this.etcAnsYn = etcAnsYn;
    }
}
