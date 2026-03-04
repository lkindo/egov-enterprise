package com.company.project.domain.board;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity(name = "BoardTemplate")
@Table(name = "NTMPLATINFO")
public class Template {

    @Id
    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "TMPLAT_NM", nullable = false, length = 765)
    private String tmplatNm;

    @Column(name = "TMPLAT_COURS", nullable = false, length = 6000)
    private String tmplatCours;

    @Column(name = "USE_AT", nullable = false, length = 1)
    private String useAt;

    @Column(name = "TMPLAT_SE_CODE", length = 6, nullable = false)
    private String tmplatSeCode;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", nullable = false)
    private LocalDateTime createdDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Builder
    public Template(String tmplatId, String tmplatNm, String tmplatCours, String useAt, String tmplatSeCode,
            String frstRegisterId) {
        this.tmplatId = tmplatId;
        this.tmplatNm = tmplatNm;
        this.tmplatCours = tmplatCours;
        this.useAt = useAt == null ? "Y" : useAt;
        this.tmplatSeCode = tmplatSeCode;
        this.frstRegisterId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
    }

    public void setTmplatNm(String tmplatNm) {
        this.tmplatNm = tmplatNm;
    }

    public void setTmplatCours(String tmplatCours) {
        this.tmplatCours = tmplatCours;
    }

    public void setTmplatSeCode(String tmplatSeCode) {
        this.tmplatSeCode = tmplatSeCode;
    }

    public void setUseAt(String useAt) {
        this.useAt = useAt;
    }
}