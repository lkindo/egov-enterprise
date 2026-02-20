package com.company.project.domain.dam;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 筌왖??뱀젟癰?JPA Entity
 * ??뉕탢?????뵠?? NDAMKNOIFM
 */
@Entity
@Table(name = "NDAMKNOIFM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KnowledgeInf {

    @Id
    @Column(name = "KNWLDG_ID", length = 20)
    private String knoId;

    @Column(name = "KNWLDG_NM", length = 255, nullable = false)
    private String knoNm;

    @Column(name = "KNWLDG_CN", length = 4000)
    private String knoCn;

    @Column(name = "KNWLDG_TY_CODE", length = 20)
    private String knoTypeCd;

    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "EXPERT_ID", length = 20)
    private String speId;

    @Column(name = "OTHBC_AT", length = 1)
    private String othbcAt;

    @Column(name = "EVL_DE", length = 20)
    private String appYmd;

    @Column(name = "KNWLDG_EVL", length = 1)
    private String knoAps;

    @Column(name = "DSUSE_DE", length = 20)
    private String junkYmd;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public KnowledgeInf(String knoId, String knoNm, String knoCn, String knoTypeCd,
            String orgnztId, String speId, String othbcAt, String appYmd, String knoAps,
            String junkYmd, String atchFileId, String frstRegisterId) {
        this.knoId = knoId;
        this.knoNm = knoNm;
        this.knoCn = knoCn;
        this.knoTypeCd = knoTypeCd;
        this.orgnztId = orgnztId;
        this.speId = speId;
        this.othbcAt = othbcAt;
        this.appYmd = appYmd;
        this.knoAps = knoAps;
        this.junkYmd = junkYmd;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
