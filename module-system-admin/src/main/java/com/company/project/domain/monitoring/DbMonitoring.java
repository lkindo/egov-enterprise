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

@Entity
@Table(name = "NDBMNTRNG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DbMonitoring {

    @Id
    @Column(name = "DATA_SOURC_NM", length = 60)
    private String dataSourcNm;

    @Column(name = "SERVER_NM", length = 60)
    private String serverNm;

    @Column(name = "DBMS_KND", length = 2)
    private String dbmsKind;

    @Column(name = "CECK_SQL", length = 250)
    private String ceckSql;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "MNTRNG_STTUS", length = 2)
    private String mntrngSttus;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Builder
    public DbMonitoring(String dataSourcNm, String serverNm, String dbmsKind, String ceckSql,
            String mngrNm, String mngrEmailAddr, String mntrngSttus, String frstRegisterId) {
        this.dataSourcNm = dataSourcNm;
        this.serverNm = serverNm;
        this.dbmsKind = dbmsKind;
        this.ceckSql = ceckSql;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.mntrngSttus = mntrngSttus;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
        this.creatDt = LocalDateTime.now();
    }

    public void update(String serverNm, String dbmsKind, String ceckSql, String mngrNm,
            String mngrEmailAddr, String mntrngSttus, String lastUpdusrId) {
        this.serverNm = serverNm;
        this.dbmsKind = dbmsKind;
        this.ceckSql = ceckSql;
        this.mngrNm = mngrNm;
        this.mngrEmailAddr = mngrEmailAddr;
        this.mntrngSttus = mntrngSttus;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
        this.creatDt = LocalDateTime.now();
    }
}
