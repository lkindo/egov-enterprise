package com.company.project.domain.log;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 로그인 로그 엔티티 (NLOGINLOG 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NLOGINLOG")
public class LoginLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "CONECT_MTHD", length = 1)
    private String conectMthd; // I: Login, O: Logout

    @Column(name = "CONECT_ID", length = 20)
    private String conectId; // ESNTL_ID

    @Column(name = "CONECT_IP", length = 50)
    private String conectIp;

    @Column(name = "ERROR_OCCRRNC_AT", length = 1)
    private String errOccrrAt;

    @Column(name = "ERROR_CODE", length = 10)
    private String errorCode;

    @Column(name = "CREAT_DT", nullable = false)
    private LocalDateTime creatDt;

    @Builder
    public LoginLog(String logId, String conectMthd, String conectId, String conectIp, String errOccrrAt,
            String errorCode) {
        this.logId = logId;
        this.conectMthd = conectMthd;
        this.conectId = conectId;
        this.conectIp = conectIp;
        this.errOccrrAt = errOccrrAt;
        this.errorCode = errorCode;
        this.creatDt = LocalDateTime.now();
    }
}
