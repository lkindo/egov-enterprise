package com.company.project.domain.dam;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 筌왖??멥룋(鈺곌퀣彛? JPA Entity
 * ??뉕탢?????뵠?? NDAMMAPTEAM
 */
@Entity
@Table(name = "NDAMMAPTEAM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapTeam {

    @Id
    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "ORGNZT_NM", length = 100, nullable = false)
    private String orgnztNm;

    @Column(name = "CL_DE", length = 20)
    private String clYmd;

    @Column(name = "KNWLDG_URL", length = 255)
    private String knoUrl;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public MapTeam(String orgnztId, String orgnztNm, String clYmd, String knoUrl, String lastUpdusrId) {
        this.orgnztId = orgnztId;
        this.orgnztNm = orgnztNm;
        this.clYmd = clYmd;
        this.knoUrl = knoUrl;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
