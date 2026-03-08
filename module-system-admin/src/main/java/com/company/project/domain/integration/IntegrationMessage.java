package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "NCNTCMESSAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IntegrationMessage {

    @Id
    @Column(name = "CNTC_MSSAGE_ID", length = 20)
    private String cntcMessageId;

    @Column(name = "CNTC_MSSAGE_NM", length = 100, nullable = false)
    private String cntcMessageNm;

    @Column(name = "UPPER_CNTC_MSSAGE_ID", length = 20)
    private String upperCntcMessageId;

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
    public IntegrationMessage(String cntcMessageId, String cntcMessageNm, String upperCntcMessageId, String useAt,
            String frstRegisterId) {
        this.cntcMessageId = cntcMessageId;
        this.cntcMessageNm = cntcMessageNm;
        this.upperCntcMessageId = upperCntcMessageId;
        this.useAt = useAt != null ? useAt : "Y";
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = frstRegisterId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String cntcMessageNm, String upperCntcMessageId, String updusrId) {
        this.cntcMessageNm = cntcMessageNm;
        this.upperCntcMessageId = upperCntcMessageId;
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void delete(String updusrId) {
        this.useAt = "N";
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
