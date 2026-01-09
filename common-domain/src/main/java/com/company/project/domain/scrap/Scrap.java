package com.company.project.domain.scrap;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 스크랩 JPA Entity
 * 레거시 테이블: COMTNSCRAP
 */
@Entity
@Table(name = "NSCRAP")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Scrap {

    @Id
    @Column(name = "SCRAP_ID", length = 20)
    private String scrapId;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "NTT_ID")
    private Long nttId;

    @Column(name = "SCRAP_NM", length = 100)
    private String scrapNm;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20, insertable = false, updatable = false)
    private String uniqId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Scrap(String scrapId, String bbsId, Long nttId, String scrapNm,
            String useAt, String uniqId, String frstRegisterId) {
        this.scrapId = scrapId;
        this.bbsId = bbsId;
        this.nttId = nttId;
        this.scrapNm = scrapNm;
        this.useAt = useAt;
        this.uniqId = uniqId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String scrapNm, String useAt, String updusrId) {
        this.scrapNm = scrapNm;
        this.useAt = useAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
