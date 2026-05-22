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

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_sys_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class SysLog extends BaseEntity {

    @Id
    @Column(name = "dmnd_id", length = 20)
    private String dmndId;

    @Column(name = "srvc_nm", length = 100)
    private String srvcNm;

    @Column(name = "mthd_nm", length = 100)
    private String mthdNm;

    @Column(name = "prcs_se_cd", length = 12)
    private String prcsSeCd;

    @Column(name = "prcs_tm", length = 14)
    private String prcsTm;

    @Column(name = "dmnd_user_id", length = 20)
    private String dmndUserId;

    @Column(name = "dmnd_user_ip_addr", length = 30)
    private String dmndUserIpAddr;

    @Column(name = "ocrn_ymd", length = 8)
    private String ocrnYmd;

    @Column(name = "rspns_cd", length = 12)
    private String rspnsCd;

    @Column(name = "err_cd", length = 12)
    private String errCd;

    @Column(name = "err_se_cd", length = 12)
    private String errSeCd;

    public SysLog(String dmndId, String srvcNm, String mthdNm, String prcsSeCd, String prcsTm,
            String dmndUserId, String dmndUserIpAddr, String ocrnYmd, String rspnsCd, String errCd, String errSeCd) {
        this.dmndId = dmndId;
        this.srvcNm = srvcNm;
        this.mthdNm = mthdNm;
        this.prcsSeCd = prcsSeCd;
        this.prcsTm = prcsTm;
        this.dmndUserId = dmndUserId;
        this.dmndUserIpAddr = dmndUserIpAddr;
        this.ocrnYmd = ocrnYmd;
        this.rspnsCd = rspnsCd;
        this.errCd = errCd;
        this.errSeCd = errSeCd;
    }

    public static abstract class SysLogBuilder<C extends SysLog, B extends SysLogBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String mthdNm;

        public B methodNm(String methodNm) {
            this.mthdNm = methodNm;
            return self();
        }
    }

    // ----- [Legacy Aliases] -----

    public String getMethodNm() {
        return this.mthdNm;
    }

    public String getRqesterIp() {
        return this.dmndUserIpAddr;
    }
}
