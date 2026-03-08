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
@Table(name = "NHHTTPMONLOG")
public class HttpMonLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "SYS_ID", length = 20)
    private String sysId;

    @Column(name = "WEBSVC_KND", length = 60)
    private String webKind;

    @Column(name = "SITE_URL", length = 255)
    private String siteUrl;

    @Column(name = "HTTP_STTUS_CODE", length = 3)
    private String httpSttusCd;

    @Column(name = "LOG_INFO", length = 2000)
    private String logInfo;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;
}
