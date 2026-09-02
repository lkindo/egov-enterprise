package nuri.business.domain.log;
import nuri.foundation.domain.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tb_login_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoginLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "lgn_sn", updatable = false, nullable = false)
    private Long lgnSn;

    @Column(length = 20)
    private String userId;

    @Column(length = 45)
    private String lgnIpAddr;

    @Column(length = 12)
    private String cntnMthdCd;

    @Column(length = 1)
    private String errOcrnYn;

    @Column(length = 12)
    private String errCd;

    private LoginLog(Long lgnSn, String userId, String lgnIpAddr, String cntnMthdCd, String errOcrnYn,
            String errCd) {
        this.lgnSn = lgnSn;
        this.userId = userId;
        this.lgnIpAddr = lgnIpAddr;
        this.cntnMthdCd = cntnMthdCd;
        this.errOcrnYn = errOcrnYn;
        this.errCd = errCd;
    }

    @Builder
    public static LoginLog create(Long lgnSn, String userId, String lgnIpAddr, String cntnMthdCd, String errOcrnYn,
            String errCd) {
        return new LoginLog(lgnSn, userId, lgnIpAddr, cntnMthdCd, errOcrnYn, errCd);
    }

}
