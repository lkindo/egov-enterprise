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
@Table(name = "tb_login_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class LoginLog extends BaseEntity {

    @Id
    @Column(name = "log_id", length = 20)
    private String logId;

    @Column(name = "user_id", length = 20)
    private String loginId;

    @Column(name = "lgn_ip_addr", length = 30)
    private String loginIp;

    @Column(name = "cntn_mthd_cd", length = 10)
    private String loginMthd;

    @Column(name = "err_ocrn_yn", length = 1)
    private String errOccrrAt;

    @Column(name = "err_cd", length = 3)
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
