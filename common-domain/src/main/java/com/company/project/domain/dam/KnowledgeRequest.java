package com.company.project.domain.dam;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 지식정보제공/요청 JPA Entity
 * 레거시 테이블: NDAMCALRES
 */
@Entity
@Table(name = "NDAMCALRES")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KnowledgeRequest {

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

    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "PARNTS_KNWLDG_ID", length = 20)
    private String ansParents;

    @Column(name = "ANSWER_DP")
    private Integer ansDepth;

    @Column(name = "ANSWER_ORDR")
    private Integer ansSeq;

    @Column(name = "ANSWER_GROUP_NO")
    private Long ansNumber;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public KnowledgeRequest(String knoId, String knoNm, String knoCn, String knoTypeCd,
            String orgnztId, String speId, String emplyrId, String atchFileId,
            String ansParents, Integer ansDepth, Integer ansSeq, Long ansNumber,
            String frstRegisterId) {
        this.knoId = knoId;
        this.knoNm = knoNm;
        this.knoCn = knoCn;
        this.knoTypeCd = knoTypeCd;
        this.orgnztId = orgnztId;
        this.speId = speId;
        this.emplyrId = emplyrId;
        this.atchFileId = atchFileId;
        this.ansParents = ansParents;
        this.ansDepth = ansDepth;
        this.ansSeq = ansSeq;
        this.ansNumber = ansNumber;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
