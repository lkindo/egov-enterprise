package com.company.project.domain.system.monitoring;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NHTTPMON")
public class HttpMon {

    @Id
    @Column(name = "SYS_ID", length = 20)
    private String sysId;

    @Column(name = "WEBSVC_KND", length = 60)
    private String webKind;

    @Column(name = "SITE_URL", length = 255)
    private String siteUrl;

    @Column(name = "HTTP_STTUS_CODE", length = 3)
    private String httpSttusCd;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "DELETE_AT", length = 1)
    private String deleteAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;
}