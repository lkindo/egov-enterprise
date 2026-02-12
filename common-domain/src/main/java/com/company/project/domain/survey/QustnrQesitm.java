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
 * 설문 문항 정보 Entity
 * 레거시 테이블: NQUSTNRQESITM
 */
@Entity
@Table(name = "NQUSTNRQESITM")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QustnrQesitm extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String qestnrQesitmId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "QESTN_SN")
    private Long qestnSn;

    @Column(name = "QESTN_TY_CODE", length = 1)
    private String qestnTyCode;

    @Column(name = "QESTN_CN", length = 2500, nullable = false)
    private String qestnCn;

    @Column(name = "MXMM_CHOISE_CO")
    private Integer mxmmChoiseCo;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Builder
    public QustnrQesitm(String qestnrQesitmId, String qestnrId, Long qestnSn, String qestnTyCode,
                       String qestnCn, Integer mxmmChoiseCo, String qestnrTmplatId) {
        this.qestnrQesitmId = qestnrQesitmId;
        this.qestnrId = qestnrId;
        this.qestnSn = qestnSn;
        this.qestnTyCode = qestnTyCode;
        this.qestnCn = qestnCn;
        this.mxmmChoiseCo = mxmmChoiseCo;
        this.qestnrTmplatId = qestnrTmplatId;
    }

    public void update(Long qestnSn, String qestnTyCode, String qestnCn, Integer mxmmChoiseCo) {
        this.qestnSn = qestnSn;
        this.qestnTyCode = qestnTyCode;
        this.qestnCn = qestnCn;
        this.mxmmChoiseCo = mxmmChoiseCo;
    }
}
