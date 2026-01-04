package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 연계 기관 JPA Entity
 * 레거시 테이블: COMTCCNTCINSTTINFO
 */
@Entity
@Table(name = "COMTCCNTCINSTTINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IntegrationInstitution {

    @Id
    @Column(name = "INSTT_ID", length = 20)
    private String insttId;

    @Column(name = "INSTT_NM", length = 100, nullable = false)
    private String insttNm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public IntegrationInstitution(String insttId, String insttNm, String frstRegisterId) {
        this.insttId = insttId;
        this.insttNm = insttNm;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String insttNm, String updusrId) {
        this.insttNm = insttNm;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
