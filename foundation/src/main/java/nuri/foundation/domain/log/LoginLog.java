package nuri.foundation.domain.log;
import nuri.foundation.domain.common.BaseEntity;
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
@Table(name = "TB_LOGIN_LOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class LoginLog extends BaseEntity {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "USER_ID", length = 20)
    private String loginId;

    @Column(name = "LGN_IP_ADDR", length = 30)
    private String loginIp;

    @Column(name = "CNTN_MTHD_CD", length = 10)
    private String loginMthd;

    @Column(name = "ERR_OCRN_YN", length = 1)
    private String errOccrrAt;

    @Column(name = "ERR_CD", length = 3)
    private String errorCode;

    public LoginLog(String logId, String loginId, String loginIp, String loginMthd, String errOccrrAt, String errorCode,
            LocalDateTime createdDate) {
        this.logId = logId;
        this.loginId = loginId;
        this.loginIp = loginIp;
        this.loginMthd = loginMthd;
        this.errOccrrAt = errOccrrAt;
        this.errorCode = errorCode;
        this.createdDate = createdDate;
    }
}
