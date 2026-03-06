package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "NCNTCINSTT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IntegrationInstitution {

    @Id
    @Column(name = "INSTT_ID", length = 20)
    private String insttId;

    @Column(name = "INSTT_NM", length = 100, nullable = false)
    private String insttNm;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Builder
    public IntegrationInstitution(String insttId, String insttNm, String useAt, String frstRegisterId) {
        this.insttId = insttId;
        this.insttNm = insttNm;
        this.useAt = useAt != null ? useAt : "Y";
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = frstRegisterId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String insttNm, String updusrId) {
        this.insttNm = insttNm;
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void delete(String updusrId) {
        this.useAt = "N";
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
