package nuri.foundation.domain.operation;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 포상 관리 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_rward_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class RewardManage extends BaseEntity {

    @Id
    @Column(name = "rwrd_id", length = 20)
    private String rwardId;

    @Column(name = "rwrd_user_id", length = 20, nullable = false)
    private String rwardwnrId;

    @Column(name = "rwrd_cd", length = 12, nullable = false)
    private String rwardCode;

    @Column(name = "rwrd_ymd", length = 8)
    private String rwardDe;

    @Column(name = "rwrd_nm", length = 100)
    private String rwardNm;

    @Column(name = "cntrb_cn", length = 4000)
    private String pblenCn;

    @Column(name = "atrzr_id", length = 20)
    private String sanctnerId;

    @Column(name = "confm_yn", length = 1)
    private String confmAt;

    @Column(name = "aprv_dt")
    private java.time.LocalDateTime sanctnDt;

    @Column(name = "rtn_rsn_cn", length = 4000)
    private String returnResn;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "ifml_atrz_id", length = 20)
    private String informlSanctnId;

    public void update(String rwardDe, String rwardNm, String pblenCn) {
        this.rwardDe = rwardDe;
        this.rwardNm = rwardNm;
        this.pblenCn = pblenCn;
    }
}
