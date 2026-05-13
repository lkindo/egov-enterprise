package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SURVEY_TMPLT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrTmplat extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qustnrTmplatId;

    @Column(name = "SRVY_TMPLT_TYPE", length = 100)
    private String qustnrTmplatTy;

    @Column(name = "QUSTNR_TMPLAT_DC", length = 2000)
    private String qustnrTmplatCn; // DTO와 맞춤 (Cn)

    @Column(name = "QUSTNR_TMPLAT_PATH_NM", length = 100)
    private String qustnrTmplatImagepathnm; // DTO와 맞춤 (Imagepathnm)

    @Column(name = "SRVY_TMPLT_IMG_INFO")
    private byte[] qustnrTmplatImageInfo;

    public void update(String qustnrTmplatTy, String qustnrTmplatImagepathnm, String qustnrTmplatCn) {
        this.qustnrTmplatTy = qustnrTmplatTy;
        this.qustnrTmplatImagepathnm = qustnrTmplatImagepathnm;
        this.qustnrTmplatCn = qustnrTmplatCn;
    }
}
