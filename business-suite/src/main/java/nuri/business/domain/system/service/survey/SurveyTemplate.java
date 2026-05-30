package nuri.business.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 템플릿 엔티티 (물리 DB 명세 100% 일치)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_tmplt")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyTemplate extends BaseEntity {

    @Id
    @Column(name = "srvy_tmplt_id", length = 20)
    private String srvyTmpltId;

    @Column(length = 12)
    private String srvyTmpltTypeCd;

    @Column(length = 4000)
    private String srvyTmpltExpln;

    @Column(length = 100)
    private String srvyTmpltPathNm;

    private byte[] srvyTmpltImgInfo;

    public void update(String srvyTmpltTypeCd, String srvyTmpltPathNm, String srvyTmpltExpln) {
        this.srvyTmpltTypeCd = srvyTmpltTypeCd;
        this.srvyTmpltPathNm = srvyTmpltPathNm;
        this.srvyTmpltExpln = srvyTmpltExpln;
    }
}
