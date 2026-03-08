package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "NCNTCSYSTEM")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IntegrationSystem {

    @EmbeddedId
    private IntegrationSystemId id;

    @Column(name = "SYS_NM", length = 100, nullable = false)
    private String sysNm;

    @Column(name = "SYS_IP", length = 23)
    private String sysIp;

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
    public IntegrationSystem(IntegrationSystemId id, String sysNm, String sysIp, String useAt, String frstRegisterId) {
        this.id = id;
        this.sysNm = sysNm;
        this.sysIp = sysIp;
        this.useAt = useAt != null ? useAt : "Y";
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = frstRegisterId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String sysNm, String sysIp, String updusrId) {
        this.sysNm = sysNm;
        this.sysIp = sysIp;
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void delete(String updusrId) {
        this.useAt = "N";
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class IntegrationSystemId implements Serializable {
        @Column(name = "INSTT_ID", length = 20)
        private String insttId;

        @Column(name = "SYS_ID", length = 20)
        private String sysId;
    }
}
