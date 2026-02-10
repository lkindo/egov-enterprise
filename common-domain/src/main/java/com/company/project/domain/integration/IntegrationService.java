package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "NCNTCSERVICE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IntegrationService {

    @EmbeddedId
    private IntegrationServiceId id;

    @Column(name = "SVC_NM", length = 100, nullable = false)
    private String svcNm;

    @Column(name = "REQUST_MSSAGE_ID", length = 20)
    private String requestMessageId;

    @Column(name = "RSPNS_MSSAGE_ID", length = 20)
    private String rspnsMessageId;

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
    public IntegrationService(IntegrationServiceId id, String svcNm, String requestMessageId, String rspnsMessageId,
            String useAt, String frstRegisterId) {
        this.id = id;
        this.svcNm = svcNm;
        this.requestMessageId = requestMessageId;
        this.rspnsMessageId = rspnsMessageId;
        this.useAt = useAt != null ? useAt : "Y";
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = frstRegisterId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String svcNm, String requestMessageId, String rspnsMessageId, String updusrId) {
        this.svcNm = svcNm;
        this.requestMessageId = requestMessageId;
        this.rspnsMessageId = rspnsMessageId;
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
    public static class IntegrationServiceId implements Serializable {
        @Column(name = "INSTT_ID", length = 20)
        private String insttId;

        @Column(name = "SYS_ID", length = 20)
        private String sysId;

        @Column(name = "SVC_ID", length = 20)
        private String svcId;
    }
}
