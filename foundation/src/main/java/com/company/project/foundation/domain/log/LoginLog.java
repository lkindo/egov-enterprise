package com.company.project.foundation.domain.log;
import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NLOGINLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class LoginLog extends BaseEntity {

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
