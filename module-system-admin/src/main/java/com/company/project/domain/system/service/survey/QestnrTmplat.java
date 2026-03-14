package com.company.project.domain.system.service.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문지 템플릿 엔티티
 * 매핑 테이블: NQESTNRTMPLAT
 */
@Entity
@Table(name = "NQESTNRTMPLAT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class QestnrTmplat extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Column(name = "QUSTNR_TMPLAT_TY", length = 100)
    private String qestnrTmplatTy;

    @Column(name = "QUSTNR_TMPLAT_IMAGEPATHNM", length = 100)
    private String qestnrTmplatImagepathnm;

    @Column(name = "QUSTNR_TMPLAT_CN", length = 1000)
    private String qestnrTmplatCn;

    public void update(String qestnrTmplatTy, String qestnrTmplatImagepathnm, String qestnrTmplatCn) {
        this.qestnrTmplatTy = qestnrTmplatTy;
        this.qestnrTmplatImagepathnm = qestnrTmplatImagepathnm;
        this.qestnrTmplatCn = qestnrTmplatCn;
    }
}
