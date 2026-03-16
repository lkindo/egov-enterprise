package com.company.project.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 문항 엔티티
 * 매핑 테이블: NQUSTNRQESITM
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NQUSTNRQESITM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
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

    @Column(name = "QESTN_CN", length = 2500)
    private String qestnCn;

    @Column(name = "MXMM_CHOISE_CO")
    private Integer mxmmChoiseCo;

    public void update(Long qestnSn, String qestnTyCode, String qestnCn, Integer mxmmChoiseCo) {
        this.qestnSn = qestnSn;
        this.qestnTyCode = qestnTyCode;
        this.qestnCn = qestnCn;
        this.mxmmChoiseCo = mxmmChoiseCo;
    }
}
