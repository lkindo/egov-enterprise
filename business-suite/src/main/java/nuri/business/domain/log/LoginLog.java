package nuri.business.domain.log;
import nuri.business.domain.common.BaseEntity;
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

    @Column(length = 20)
    private String userId;

    @Column(length = 30)
    private String lgnIpAddr;

    @Column(length = 12)
    private String cntnMthdCd;

    @Column(length = 1)
    private String errOcrnYn;

    @Column(length = 12)
    private String errCd;

    public LoginLog(String logId, String userId, String lgnIpAddr, String cntnMthdCd, String errOcrnYn, String errCd,
            LocalDateTime createdDate) {
        this.logId = logId;
        this.userId = userId;
        this.lgnIpAddr = lgnIpAddr;
        this.cntnMthdCd = cntnMthdCd;
        this.errOcrnYn = errOcrnYn;
        this.errCd = errCd;
        this.crtDt = createdDate;
    }

}
