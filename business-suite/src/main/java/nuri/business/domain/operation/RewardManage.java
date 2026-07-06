package nuri.business.domain.operation;

import nuri.business.domain.common.BaseEntity;
import lombok.Builder;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 포상 관리 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 */
@Entity
@Table(name = "tb_rward_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    // Phase 5.2: 팩토리 파라미터 기반 private 생성자 (빌더/create() 위임 대상)
    private RewardManage(String rwrdId, String rwrdUserId, String rwrdCd, String rwrdYmd, String rwrdNm,
                         String cntrbCn, String atrzrId, String confmYn, java.time.LocalDateTime aprvDt,
                         String rtnRsnCn, String atchFileId, String ifmlAtrzId) {
        this.rwrdId = rwrdId;
        this.rwrdUserId = rwrdUserId;
        this.rwrdCd = rwrdCd;
        this.rwrdYmd = rwrdYmd;
        this.rwrdNm = rwrdNm;
        this.cntrbCn = cntrbCn;
        this.atrzrId = atrzrId;
        this.confmYn = confmYn;
        this.aprvDt = aprvDt;
        this.rtnRsnCn = rtnRsnCn;
        this.atchFileId = atchFileId;
        this.ifmlAtrzId = ifmlAtrzId;
    }

    /**
     * Phase 5.2: 빌더는 정적 팩토리 create() 에 배치.
     * 기존 RewardManage.builder()...build() 호출부는 그대로 동작한다.
     * 감사 필드(frstRgtrId/lastMdfrId/crtDt/mdfcnDt)와 읽기전용 연관(fileMaster)은 제외.
     */
    @Builder
    public static RewardManage create(String rwrdId, String rwrdUserId, String rwrdCd, String rwrdYmd, String rwrdNm,
                                      String cntrbCn, String atrzrId, String confmYn, java.time.LocalDateTime aprvDt,
                                      String rtnRsnCn, String atchFileId, String ifmlAtrzId) {
        return new RewardManage(rwrdId, rwrdUserId, rwrdCd, rwrdYmd, rwrdNm, cntrbCn, atrzrId, confmYn, aprvDt,
                rtnRsnCn, atchFileId, ifmlAtrzId);
    }

    public void update(String rwardDe, String rwardNm, String pblenCn) {
        this.rwrdYmd = rwardDe;
        this.rwrdNm = rwardNm;
        this.cntrbCn = pblenCn;
    }
}
