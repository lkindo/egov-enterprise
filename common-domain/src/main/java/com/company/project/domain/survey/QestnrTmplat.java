package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * ??뿅??쀫탣???類ｋ궖 Entity
 * ??뉕탢?????뵠?? NQUSTNRTMPLAT
 */
@Entity
@Table(name = "NQUSTNRTMPLAT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QestnrTmplat extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Column(name = "QUSTNR_TMPLAT_TY", length = 100, nullable = false)
    private String qestnrTmplatTy;

    @Column(name = "QUSTNR_TMPLAT_IMAGE_INFO", length = 2000)
    private String qestnrTmplatImagepathnm;

    @Column(name = "QUSTNR_TMPLAT_DC", length = 2000)
    private String qestnrTmplatCn;

    public void update(String qestnrTmplatTy, String qestnrTmplatImagepathnm, String qestnrTmplatCn) {
        this.qestnrTmplatTy = qestnrTmplatTy;
        this.qestnrTmplatImagepathnm = qestnrTmplatImagepathnm;
        this.qestnrTmplatCn = qestnrTmplatCn;
    }
}
