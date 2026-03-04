package com.company.project.domain.monitoring;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "NSYNCHRNSERVERINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SynchrnServer {

    @Id
    @Column(name = "SERVER_ID", length = 20)
    private String serverId;

    @Column(name = "SERVER_NM", length = 60)
    private String serverNm;

    @Column(name = "SERVER_IP", length = 23)
    private String serverIp;

    @Column(name = "SERVER_PORT", length = 10)
    private String serverPort;

    @Column(name = "FTP_ID", length = 20)
    private String ftpId;

    @Column(name = "FTP_PASSWORD", length = 20)
    private String ftpPassword;

    @Column(name = "SYNCHRN_LC", length = 255)
    private String synchrnLc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String serverNm, String serverIp, String serverPort, String ftpId, String ftpPassword,
            String synchrnLc, String lastUpdusrId) {
        this.serverNm = serverNm;
        this.serverIp = serverIp;
        this.serverPort = serverPort;
        this.ftpId = ftpId;
        this.ftpPassword = ftpPassword;
        this.synchrnLc = synchrnLc;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    public void updateReflctAt(String reflctAt) {
        this.reflctAt = reflctAt;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}