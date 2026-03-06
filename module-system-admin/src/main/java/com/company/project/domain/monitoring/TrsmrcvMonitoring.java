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
@Table(name = "NTRSMRCVMNTRNG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TrsmrcvMonitoring {

    @Id
    @Column(name = "CNTC_ID", length = 20)
    private String cntcId;

    @Column(name = "TEST_CLASS_NM", length = 255)
    private String testClassNm;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "MNTRNG_STTUS", length = 2)
    private String mntrngSttus;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String testClassNm, String mngrNm, String mngrEmailAddr, String mntrngSttus,
            String lastUpdusrId) {
        this.testClassNm = testClassNm;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.mntrngSttus = mntrngSttus;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
        this.creatDt = LocalDateTime.now();
    }
}
