package com.company.project.domain.knowledge;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 지식관리 JPA Entity
 * 레거시 테이블: COMTNKNOWLEDGE
 */
@Entity
@Table(name = "NKNOWLEDGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Knowledge {

    @Id
    @Column(name = "KNO_ID", length = 20)
    private String knoId;

    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "KNO_TYPE_CD", length = 20)
    private String knoTypeCd;

    @Column(name = "KNO_NM", length = 255, nullable = false)
    private String knoNm;

    @Column(name = "KNO_CN", length = 4000)
    private String knoCn;

    @Column(name = "OTHBC_AT", length = 1)
    private String othbcAt;

    @Column(name = "COL_YMD", length = 20)
    private String colYmd;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Knowledge(String knoId, String orgnztId, String emplyrId, String knoTypeCd,
            String knoNm, String knoCn, String othbcAt, String atchFileId, String frstRegisterId) {
        this.knoId = knoId;
        this.orgnztId = orgnztId;
        this.emplyrId = emplyrId;
        this.knoTypeCd = knoTypeCd;
        this.knoNm = knoNm;
        this.knoCn = knoCn;
        this.othbcAt = othbcAt;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.colYmd = java.time.LocalDate.now().toString().replace("-", "");
    }

    public void update(String knoTypeCd, String knoNm, String knoCn, String othbcAt,
            String atchFileId, String updusrId) {
        this.knoTypeCd = knoTypeCd;
        this.knoNm = knoNm;
        this.knoCn = knoCn;
        this.othbcAt = othbcAt;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
