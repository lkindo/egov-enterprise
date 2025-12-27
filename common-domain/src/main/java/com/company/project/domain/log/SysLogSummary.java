package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "SSYSLOGSUMMARY")
@IdClass(SysLogSummaryId.class)
public class SysLogSummary {

    @Id
    @Column(name = "SRVC_NM", length = 60)
    private String srvcNm;

    @Id
    @Column(name = "METHOD_NM", length = 20)
    private String methodNm;

    @Id
    @Column(name = "OCCRRNC_DE", length = 8)
    private String occrrncDe;

    @Column(name = "CREAT_CO")
    private Long creatCo;

    @Column(name = "UPDT_CO")
    private Long updtCo;

    @Column(name = "RDCNT")
    private Long rdcnt;

    @Column(name = "DELETE_CO")
    private Long deleteCo;

    @Column(name = "OUTPT_CO")
    private Long outptCo;

    @Column(name = "ERROR_CO")
    private Long errorCo;
}
