package nuri.business.domain.operation;

import nuri.business.domain.common.BaseEntity;
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
    @Column(length = 20)
    private String rwrdId;

    @Column(length = 20, nullable = false)
    private String rwrdUserId;

    @Column(length = 12, nullable = false)
    private String rwrdCd;

    @Column(length = 8)
    private String rwrdYmd;

    @Column(length = 100)
    private String rwrdNm;

    @Column(length = 4000)
    private String cntrbCn;

    @Column(length = 20)
    private String atrzrId;

    @Column(length = 1)
    private String confmYn;

    private java.time.LocalDateTime aprvDt;

    @Column(length = 4000)
    private String rtnRsnCn;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @Column(length = 20)
    private String ifmlAtrzId;

    public void update(String rwardDe, String rwardNm, String pblenCn) {
        this.rwrdYmd = rwardDe;
        this.rwrdNm = rwardNm;
        this.cntrbCn = pblenCn;
    }
}
