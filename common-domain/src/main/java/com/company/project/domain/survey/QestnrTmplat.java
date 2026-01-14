package com.company.project.domain.survey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 설문템플릿 JPA Entity
 * 레거시 테이블: COMTNQUSTNRTRMPLAT
 */
@Entity
@Table(name = "NQUSTNRTMPLAT")
@Getter
@Setter
@NoArgsConstructor
public class QestnrTmplat {

    @Id
    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Column(name = "QUSTNR_TMPLAT_TY", length = 100)
    private String qestnrTmplatTy;

    @Column(name = "QUSTNR_TMPLAT_IMAGE_INFO", length = 2000) // VO에는 Imagepathnm으로 되어 있으나 DB 컬럼명 확인 필요. 보통 IMAGE_INFO
                                                              // 사용
    private String qestnrTmplatImagepathnm;

    @Column(name = "QUSTNR_TMPLAT_DC", length = 2000)
    private String qestnrTmplatCn;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;
}
