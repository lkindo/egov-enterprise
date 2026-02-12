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
 * 설문 정보 Entity
 * 레거시 테이블: NQESTNRINFO
 */
@Entity
@Table(name = "NQESTNRINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QestnrInfo extends BaseEntity {

    @Id
    @Column(name = "QESTNR_ID", length = 20)
    private String qestnrId;

    @Column(name = "QUSTNR_SJ", length = 255, nullable = false)
    private String qestnrSj;

    @Column(name = "QUSTNR_PURPS", length = 1000)
    private String qestnrPurps;

    @Column(name = "QUSTNR_WRITNG_GUIDANCE_CN", length = 2000)
    private String qestnrWritngGuidanceCn;

    @Column(name = "QUSTNR_BGNDE", length = 10)
    private String qestnrBeginDe;

    @Column(name = "QUSTNR_ENDDE", length = 10)
    private String qestnrEndDe;

    @Column(name = "QUSTNR_TRGET", length = 1000)
    private String qestnrTrget;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String qestnrTmplatId;

    @Builder
    public QestnrInfo(String qestnrId, String qestnrSj, String qestnrPurps, String qestnrWritngGuidanceCn,
                     String qestnrBeginDe, String qestnrEndDe, String qestnrTrget, String qestnrTmplatId) {
        this.qestnrId = qestnrId;
        this.qestnrSj = qestnrSj;
        this.qestnrPurps = qestnrPurps;
        this.qestnrWritngGuidanceCn = qestnrWritngGuidanceCn;
        this.qestnrBeginDe = qestnrBeginDe;
        this.qestnrEndDe = qestnrEndDe;
        this.qestnrTrget = qestnrTrget;
        this.qestnrTmplatId = qestnrTmplatId;
    }

    public void update(String qestnrSj, String qestnrPurps, String qestnrWritngGuidanceCn,
                      String qestnrBeginDe, String qestnrEndDe, String qestnrTrget, String qestnrTmplatId) {
        this.qestnrSj = qestnrSj;
        this.qestnrPurps = qestnrPurps;
        this.qestnrWritngGuidanceCn = qestnrWritngGuidanceCn;
        this.qestnrBeginDe = qestnrBeginDe;
        this.qestnrEndDe = qestnrEndDe;
        this.qestnrTrget = qestnrTrget;
        this.qestnrTmplatId = qestnrTmplatId;
    }
}
