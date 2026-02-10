package com.company.project.domain.system;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NNTWRKINFO")
public class Ntwrk {

    @Id
    @Column(name = "NTWRK_ID", length = 20)
    private String ntwrkId;

    @Column(name = "NTWRK_IP", length = 23)
    private String ntwrkIp;

    @Column(name = "GTWY", length = 23)
    private String gtwy;

    @Column(name = "SUBNET", length = 23)
    private String subnet;

    @Column(name = "DOMN_NM_SERVER", length = 23)
    private String domnServer;

    @Column(name = "MANAGE_IEM", length = 2)
    private String manageIem;

    @Column(name = "USER_NM", length = 60)
    private String userNm;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

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
