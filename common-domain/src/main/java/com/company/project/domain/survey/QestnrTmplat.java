package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 설문템플릿 정보 Entity
 * 레거시 테이블: NQUSTNRTMPLAT
 */
@Entity
@Table(name = "NQUSTNRTMPLAT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    @Builder
    public QestnrTmplat(String qestnrTmplatId, String qestnrTmplatTy, String qestnrTmplatImagepathnm, String qestnrTmplatCn) {
        this.qestnrTmplatId = qestnrTmplatId;
        this.qestnrTmplatTy = qestnrTmplatTy;
        this.qestnrTmplatImagepathnm = qestnrTmplatImagepathnm;
        this.qestnrTmplatCn = qestnrTmplatCn;
    }

    public void update(String qestnrTmplatTy, String qestnrTmplatImagepathnm, String qestnrTmplatCn) {
        this.qestnrTmplatTy = qestnrTmplatTy;
        this.qestnrTmplatImagepathnm = qestnrTmplatImagepathnm;
        this.qestnrTmplatCn = qestnrTmplatCn;
    }
}
