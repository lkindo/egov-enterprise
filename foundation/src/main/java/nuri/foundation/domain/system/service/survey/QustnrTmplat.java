package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NQUSTNRTMPLAT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QustnrTmplat extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qustnrTmplatId;

    @Column(name = "QUSTNR_TMPLAT_TY", length = 100)
    private String qustnrTmplatTy;

    @Column(name = "QUSTNR_TMPLAT_DC", length = 2000)
    private String qustnrTmplatCn; // DTO와 맞춤 (Cn)

    @Column(name = "QUSTNR_TMPLAT_PATH_NM", length = 100)
    private String qustnrTmplatImagepathnm; // DTO와 맞춤 (Imagepathnm)

    @Column(name = "QUSTNR_TMPLAT_IMAGE_INFO", length = 2000)
    private String qustnrTmplatImageInfo;

    public void update(String qustnrTmplatTy, String qustnrTmplatImagepathnm, String qustnrTmplatCn) {
        this.qustnrTmplatTy = qustnrTmplatTy;
        this.qustnrTmplatImagepathnm = qustnrTmplatImagepathnm;
        this.qustnrTmplatCn = qustnrTmplatCn;
    }
}
