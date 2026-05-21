package nuri.foundation.domain.log;
import nuri.foundation.domain.common.BaseEntity;
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

import nuri.foundation.domain.user.entity.User;
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
    private String methodNm;

    @Column(name = "crt_cnt")
    private Integer creatCo;

    @Column(name = "mdfcn_cnt")
    private Integer updtCo;

    @Column(name = "inq_cnt")
    private Integer rdCnt;

    @Column(name = "del_cnt")
    private Integer deleteCo;

    @Column(name = "otpt_cnt")
    private Integer outptCo;

    @Column(name = "err_cnt")
    private Integer errorCo;

    public UserLog(String ocrnYmd, String dmndUserId, String srvcNm, String methodNm,
            Integer creatCo, Integer updtCo, Integer rdCnt, Integer deleteCo,
            Integer outptCo, Integer errorCo) {
        this.ocrnYmd = ocrnYmd;
        this.dmndUserId = dmndUserId;
        this.srvcNm = srvcNm;
        this.methodNm = methodNm;
        this.creatCo = creatCo;
        this.updtCo = updtCo;
        this.rdCnt = rdCnt;
        this.deleteCo = deleteCo;
        this.outptCo = outptCo;
        this.errorCo = errorCo;
    }
}
