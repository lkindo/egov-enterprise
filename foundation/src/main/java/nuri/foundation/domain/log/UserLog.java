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
@Table(name = "NUSERLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(UserLogId.class)
@SuperBuilder
public class UserLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RQESTER_ID", referencedColumnName = "ESNTL_ID", insertable = false, updatable = false)
    private User vnUserMaster;

    @Id
    @Column(name = "OCCRRNC_DE", length = 20)
    private String occrrncDe;

    @Id
    @Column(name = "RQESTER_ID", length = 20)
    private String rqesterId;

    @Id
    @Column(name = "SVC_NM", length = 255)
    private String srvcNm;

    @Id
    @Column(name = "METHOD_NM", length = 60)
    private String methodNm;

    @Column(name = "CREAT_CO")
    private Integer creatCo;

    @Column(name = "UPDT_CO")
    private Integer updtCo;

    @Column(name = "RDCNT")
    private Integer rdCnt;

    @Column(name = "DELETE_CO")
    private Integer deleteCo;

    @Column(name = "OUTPT_CO")
    private Integer outptCo;

    @Column(name = "ERROR_CO")
    private Integer errorCo;

    public UserLog(String occrrncDe, String rqesterId, String srvcNm, String methodNm,
            Integer creatCo, Integer updtCo, Integer rdCnt, Integer deleteCo,
            Integer outptCo, Integer errorCo) {
        this.occrrncDe = occrrncDe;
        this.rqesterId = rqesterId;
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
