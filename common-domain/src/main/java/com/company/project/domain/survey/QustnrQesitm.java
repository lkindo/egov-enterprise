package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * ??뿅??얜챸鍮??類ｋ궖 Entity
 * ??뉕탢?????뵠?? NQUSTNRQESITM
 */
@Entity
@Table(name = "NQUSTNRQESITM")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QustnrQesitm extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_QESITM_ID", length = 20)
    private String qestnrQesitmId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String qestnrTmplatId;

    @Column(name = "QESTN_SN")
    private Long qestnSn;

    @Column(name = "QESTN_TY_CODE", length = 1)
    private String qestnTyCode;

    @Column(name = "QESTN_CN", length = 2500, nullable = false)
    private String qestnCn;

    @Column(name = "MXMM_CHOISE_CO")
    private Integer mxmmChoiseCo;

    public void update(Long qestnSn, String qestnTyCode, String qestnCn, Integer mxmmChoiseCo) {
        this.qestnSn = qestnSn;
        this.qestnTyCode = qestnTyCode;
        this.qestnCn = qestnCn;
        this.mxmmChoiseCo = mxmmChoiseCo;
    }

    public void setLastUpdtPnttm(String pnttm) {
        // Compatibility
    }

    public void setFrstRegisterPnttm(String pnttm) {
        // Compatibility
    }
}
