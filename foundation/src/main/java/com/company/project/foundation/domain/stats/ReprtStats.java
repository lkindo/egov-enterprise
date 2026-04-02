package com.company.project.foundation.domain.stats;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 癰귣떯JPA Entity
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@jakarta.persistence.Entity
@jakarta.persistence.Table(name = "NREPRTSTATS")
@lombok.AllArgsConstructor
@lombok.Builder
public class ReprtStats {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String reprtId;

    @Column(name = "REPRT_NM", length = 255)
    private String reprtNm;

    @Column(name = "REPRT_STTUS", length = 1)
    private String reprtSttus;

    @Column(name = "REPRT_TY", length = 1)
    private String reprtTy;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;
}
