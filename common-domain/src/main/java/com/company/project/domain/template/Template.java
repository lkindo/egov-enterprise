package com.company.project.domain.template;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ??쀫탣??JPA Entity
 * ??뉕탢?????뵠?? COMTNTMPLATINFO
 */
@Entity(name = "CommonTemplate")
@Table(name = "NTMPLATINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Template {

    @Id
    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "TMPLAT_NM", length = 100, nullable = false)
    private String tmplatNm;

    @Column(name = "TMPLAT_COURS", length = 255)
    private String tmplatCours;

    @Column(name = "TMPLAT_SE_CODE", length = 20)
    private String tmplatSeCode;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Template(String tmplatId, String tmplatNm, String tmplatCours,
            String tmplatSeCode, String useAt, String frstRegisterId) {
        this.tmplatId = tmplatId;
        this.tmplatNm = tmplatNm;
        this.tmplatCours = tmplatCours;
        this.tmplatSeCode = tmplatSeCode;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String tmplatNm, String tmplatCours, String tmplatSeCode,
            String useAt, String updusrId) {
        this.tmplatNm = tmplatNm;
        this.tmplatCours = tmplatCours;
        this.tmplatSeCode = tmplatSeCode;
        this.useAt = useAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}