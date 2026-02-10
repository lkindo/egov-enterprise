package com.company.project.domain.monitoring;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "NNTWRKSVCMNTRNG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NetworkServiceMonitoring {

    @EmbeddedId
    private NetworkServiceId id;

    @Column(name = "SYS_NM", length = 255)
    private String sysNm;

    @Column(name = "MNTRNG_STTUS", length = 2)
    private String mntrngSttus;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public NetworkServiceMonitoring(String sysIp, Integer sysPort, String sysNm, String mngrNm,
            String mngrEmailAddr, String frstRegisterId) {
        this.id = new NetworkServiceId(sysIp, sysPort);
        this.sysNm = sysNm;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void update(String sysIp, Integer sysPort, String sysNm, String mngrNm, String mngrEmailAddr,
            String lastUpdusrId) {
        this.id = new NetworkServiceId(sysIp, sysPort);
        this.sysNm = sysNm;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void updateStatus(String mntrngSttus, LocalDateTime creatDt, String lastUpdusrId) {
        this.mntrngSttus = mntrngSttus;
        this.creatDt = creatDt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }
}
