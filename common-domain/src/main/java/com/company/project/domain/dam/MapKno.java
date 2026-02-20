package com.company.project.domain.dam;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 筌왖??멥룋(?醫륁굨) JPA Entity
 * ??뉕탢?????뵠?? NDAMMAPKNO
 */
@Entity
@Table(name = "NDAMMAPKNO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapKno {

    @Id
    @Column(name = "KNWLDG_TY_CODE", length = 20)
    private String knoTypeCd;

    @Column(name = "ORGNZT_ID", length = 20, nullable = false)
    private String orgnztId;

    @Column(name = "EXPERT_ID", length = 20)
    private String speId;

    @Column(name = "KNWLDG_TY_NM", length = 100, nullable = false)
    private String knoTypeNm;

    @Column(name = "CL_DE", length = 20)
    private String clYmd;

    @Column(name = "KNWLDG_URL", length = 255)
    private String knoUrl;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public MapKno(String knoTypeCd, String orgnztId, String speId, String knoTypeNm,
            String clYmd, String knoUrl, String frstRegisterId, String lastUpdusrId) {
        this.knoTypeCd = knoTypeCd;
        this.orgnztId = orgnztId;
        this.speId = speId;
        this.knoTypeNm = knoTypeNm;
        this.clYmd = clYmd;
        this.knoUrl = knoUrl;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
