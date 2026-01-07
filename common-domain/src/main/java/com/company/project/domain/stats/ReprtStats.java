package com.company.project.domain.stats;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 보고서 통계 JPA Entity
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NREPRTSTATS")
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
