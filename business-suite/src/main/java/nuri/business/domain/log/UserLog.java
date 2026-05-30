package nuri.business.domain.log;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

import nuri.business.domain.user.entity.User;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_user_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(UserLogId.class)
@SuperBuilder
public class UserLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DMND_USER_ID", referencedColumnName = "ESNTL_ID", insertable = false, updatable = false)
    private User vnUserMaster;

    @Id
    @Column(name = "ocrn_ymd", length = 8)
    private String ocrnYmd;

    @Id
    @Column(name = "dmnd_user_id", length = 20)
    private String dmndUserId;

    @Id
    @Column(name = "srvc_nm", length = 100)
    private String srvcNm;

    @Id
    @Column(name = "mthd_nm", length = 100)
    private String mthdNm;

    private Integer crtCnt;

    private Integer mdfcnCnt;

    private Integer inqCnt;

    private Integer delCnt;

    private Integer otptCnt;

    private Integer errCnt;

    public UserLog(String ocrnYmd, String dmndUserId, String srvcNm, String mthdNm,
            Integer crtCnt, Integer mdfcnCnt, Integer inqCnt, Integer delCnt,
            Integer otptCnt, Integer errCnt) {
        this.ocrnYmd = ocrnYmd;
        this.dmndUserId = dmndUserId;
        this.srvcNm = srvcNm;
        this.mthdNm = mthdNm;
        this.crtCnt = crtCnt;
        this.mdfcnCnt = mdfcnCnt;
        this.inqCnt = inqCnt;
        this.delCnt = delCnt;
        this.otptCnt = otptCnt;
        this.errCnt = errCnt;
    }

    // ----- [Legacy Aliases] -----

    public String getMethodNm() {
        return this.mthdNm;
    }

    public Integer getCreatCo() {
        return this.crtCnt;
    }

    public Integer getUpdtCo() {
        return this.mdfcnCnt;
    }

    public Integer getRdCnt() {
        return this.inqCnt;
    }

    public Integer getDeleteCo() {
        return this.delCnt;
    }

    public Integer getOutptCo() {
        return this.otptCnt;
    }

    public Integer getErrorCo() {
        return this.errCnt;
    }
}
