package com.company.project.domain.monitoring;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.DynamicUpdate;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@DynamicUpdate
@Table(name = "NPROXYINFO")
public class ProxySvc {

    @Id
    @Column(name = "PROXY_ID", length = 20)
    private String proxyId;

    @Column(name = "PROXY_NM", length = 60)
    private String proxyNm;

    @Column(name = "PROXY_IP", length = 23)
    private String proxyIp;

    @Column(name = "PROXY_PORT", length = 10)
    private String proxyPort;

    @Column(name = "TRGET_SVC_NM", length = 60)
    private String trgetSvcNm;

    @Column(name = "SVC_DC", length = 200)
    private String svcDc;

    @Column(name = "SVC_IP", length = 23)
    private String svcIp;

    @Column(name = "SVC_PORT", length = 10)
    private String svcPort;

    @Column(name = "SVC_STTUS", length = 2)
    private String svcSttus;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;
}
