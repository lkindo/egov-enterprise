package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "NSYSLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SysLog {

    @Id
    @Column(name = "REQUST_ID", length = 20)
    private String requstId;

    @Column(name = "SVC_NM", length = 255)
    private String srvcNm;

    @Column(name = "METHOD_NM", length = 60)
    private String methodNm;

    @Column(name = "PROCESS_SE_CODE", length = 3)
    private String processSeCode;

    @Column(name = "PROCESS_TIME", length = 14)
    private String processTime;

    @Column(name = "RQESTER_ID", length = 20)
    private String rqesterId;

    @Column(name = "RQESTER_IP", length = 23)
    private String rqesterIp;

    @Column(name = "OCCRRNC_DE", length = 20)
    private String occrrncDe;

    @Column(name = "RSPNS_CODE", length = 3)
    private String rspnsCode;

    @Column(name = "ERROR_CODE", length = 15)
    private String errorCode;

    @Column(name = "ERROR_SE", length = 3)
    private String errorSe;

    @Builder
    public SysLog(String requstId, String srvcNm, String methodNm, String processSeCode, String processTime,
            String rqesterId, String rqesterIp, String occrrncDe, String rspnsCode, String errorCode, String errorSe) {
        this.requstId = requstId;
        this.srvcNm = srvcNm;
        this.methodNm = methodNm;
        this.processSeCode = processSeCode;
        this.processTime = processTime;
        this.rqesterId = rqesterId;
        this.rqesterIp = rqesterIp;
        this.occrrncDe = occrrncDe;
        this.rspnsCode = rspnsCode;
        this.errorCode = errorCode;
        this.errorSe = errorSe;
    }
}