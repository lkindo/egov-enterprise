package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "NLOGINLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoginLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "CONECT_ID", length = 20)
    private String loginId;

    @Column(name = "CONECT_IP", length = 23)
    private String loginIp;

    @Column(name = "CONECT_MTHD", length = 10)
    private String loginMthd;

    @Column(name = "ERROR_OCCRRNC_AT", length = 1)
    private String errOccrrAt;

    @Column(name = "ERROR_CODE", length = 3)
    private String errorCode;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Builder
    public LoginLog(String logId, String loginId, String loginIp, String loginMthd, String errOccrrAt, String errorCode,
            LocalDateTime creatDt) {
        this.logId = logId;
        this.loginId = loginId;
        this.loginIp = loginIp;
        this.loginMthd = loginMthd;
        this.errOccrrAt = errOccrrAt;
        this.errorCode = errorCode;
        this.creatDt = creatDt;
    }
}