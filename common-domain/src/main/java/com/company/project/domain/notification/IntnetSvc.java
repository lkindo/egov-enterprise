package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NINTNETSVC")
public class IntnetSvc {

    @Id
    @Column(name = "INTNET_SVC_ID", length = 20)
    private String intnetSvcId;

    @Column(name = "INTNET_SVC_NM", length = 255)
    private String intnetSvcNm;

    @Column(name = "INTNET_SVC_DC", length = 1000)
    private String intnetSvcDc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public IntnetSvc(String intnetSvcId, String intnetSvcNm, String intnetSvcDc, String reflctAt,
            String frstRegisterId) {
        this.intnetSvcId = intnetSvcId;
        this.intnetSvcNm = intnetSvcNm;
        this.intnetSvcDc = intnetSvcDc;
        this.reflctAt = reflctAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String intnetSvcNm, String intnetSvcDc, String reflctAt, String lastUpdusrId) {
        this.intnetSvcNm = intnetSvcNm;
        this.intnetSvcDc = intnetSvcDc;
        this.reflctAt = reflctAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
