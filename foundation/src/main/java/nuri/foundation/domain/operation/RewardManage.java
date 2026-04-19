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
@Table(name = "NRWARDMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class RewardManage extends BaseEntity {

    @Id
    @Column(name = "RWARD_ID", length = 20)
    private String rwardId;

    @Column(name = "RWARDWNR_ID", length = 20, nullable = false)
    private String rwardwnrId;

    @Column(name = "RWARD_CODE", length = 20, nullable = false)
    private String rwardCode;

    @Column(name = "RWARD_DE", length = 20)
    private String rwardDe;

    @Column(name = "RWARD_NM", length = 255)
    private String rwardNm;

    @Column(name = "PBLEN_CN", length = 2000)
    private String pblenCn;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private java.time.LocalDateTime sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "INFORML_SANCTN_ID", length = 20)
    private String informlSanctnId;

    public void update(String rwardDe, String rwardNm, String pblenCn) {
        this.rwardDe = rwardDe;
        this.rwardNm = rwardNm;
        this.pblenCn = pblenCn;
    }
}
