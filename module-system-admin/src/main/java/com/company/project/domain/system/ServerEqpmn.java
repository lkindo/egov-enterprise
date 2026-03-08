package com.company.project.domain.system;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NSERVEREQPMNINFO")
public class ServerEqpmn {

    @Id
    @Column(name = "SERVER_EQPMN_ID", length = 20)
    private String serverEqpmnId;

    @Column(name = "SERVER_EQPMN_NM", length = 60)
    private String serverEqpmnNm;

    @Column(name = "SERVER_EQPMN_IP", length = 23)
    private String serverEqpmnIp;

    @Column(name = "SERVER_EQPMN_MNGR", length = 30)
    private String serverEqpmnMngr;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

    @Column(name = "OPERSYSM_INFO", length = 2000)
    private String opersysmInfo;

    @Column(name = "CPU_INFO", length = 2000)
    private String cpuInfo;

    @Column(name = "MORY_INFO", length = 2000)
    private String moryInfo;

    @Column(name = "HDDISK", length = 2000)
    private String hdDisk;

    @Column(name = "ETC_INFO", length = 2000)
    private String etcInfo;

    @Column(name = "RGSDE")
    private LocalDate regstYmd;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

}
