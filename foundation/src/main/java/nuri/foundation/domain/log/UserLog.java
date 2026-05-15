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
@Table(name = "TB_USER_LOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(UserLogId.class)
@SuperBuilder
public class UserLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DMND_USER_ID", referencedColumnName = "ESNTL_ID", insertable = false, updatable = false)
    private User vnUserMaster;

    @Id
    @Column(name = "OCRN_YMD", length = 20)
    private String ocrnYmd;

    @Id
    @Column(name = "DMND_USER_ID", length = 20)
    private String dmndUserId;

    @Id
    @Column(name = "SRVC_NM", length = 255)
    private String srvcNm;

    @Id
    @Column(name = "METHOD_NM", length = 60)
    private String methodNm;

    @Column(name = "CRT_CNT")
    private Integer creatCo;

    @Column(name = "MDFCN_CNT")
    private Integer updtCo;

    @Column(name = "INQ_CNT")
    private Integer rdCnt;

    @Column(name = "DEL_CNT")
    private Integer deleteCo;

    @Column(name = "OUTPT_CNT")
    private Integer outptCo;

    @Column(name = "ERR_CNT")
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
