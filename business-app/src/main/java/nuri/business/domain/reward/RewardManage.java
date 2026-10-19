package nuri.business.domain.reward;

import nuri.foundation.domain.common.BaseEntity;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rwrdSn;

    /** 낙관적 잠금 버전(V2_133). 화면이 읽은 값과 다르면 다른 사람이 먼저 고친 것이다(서비스가 409 로 거부한다). */
    @Version
    private Integer version;

    @Column(length = 20, nullable = false)
    private String rwrdUserId;

    @Column(length = 12, nullable = false)
    private String rwrdCd;

    @Column(length = 8)
    private String rwrdYmd;

    @Column(length = 300)
    private String rwrdNm;

    @Column(length = 4000)
    private String cntrbCn;

    /*
     * [2026-10-19] 승인 필드(승인자·승인 여부·승인 일시·반려 사유·연결 결재)는 승인 절차가 제품에 없어 API·화면에서 걷었다.
     *   물리 컬럼은 남기므로 매핑만 읽기 전용으로 둔다 — 앱은 이 컬럼들에 쓰지 않는다(새 포상의 승인 여부도 비워 둔다).
     */
    @Column(length = 20, insertable = false, updatable = false)
    private String atrzrId;

    @Column(length = 1, insertable = false, updatable = false)
    private String confmYn;

    @Column(insertable = false, updatable = false)
    private java.time.LocalDateTime aprvDt;

    @Column(length = 4000, insertable = false, updatable = false)
    private String rtnRsnCn;
    @Column(name = "atch_file_sn")
    private Long atchFileSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_sn", referencedColumnName = "atch_file_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @Column(name = "ifml_atrz_sn", insertable = false, updatable = false)
    private Long ifmlAtrzSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ifml_atrz_sn", referencedColumnName = "ifml_atrz_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.informalsanction.InformalSanction informalSanction;

    // Phase 5.2: 팩토리 파라미터 기반 private 생성자 (빌더/create() 위임 대상)
    private RewardManage(Long rwrdSn, String rwrdUserId, String rwrdCd, String rwrdYmd, String rwrdNm,
                         String cntrbCn, Long atchFileSn) {
        this.rwrdSn = rwrdSn;
        this.rwrdUserId = rwrdUserId;
        this.rwrdCd = rwrdCd;
        this.rwrdYmd = rwrdYmd;
        this.rwrdNm = rwrdNm;
        this.cntrbCn = cntrbCn;
        this.atchFileSn = atchFileSn;
    }

    /**
     * Phase 5.2: 빌더는 정적 팩토리 create() 에 배치.
     * 기존 RewardManage.builder()...build() 호출부는 그대로 동작한다.
     * 감사 필드(frstRgtrId/lastMdfrId/crtDt/mdfcnDt), 읽기전용 연관(fileMaster)과 읽기 전용 승인 컬럼은 제외.
     */
    @Builder
    public static RewardManage create(Long rwrdSn, String rwrdUserId, String rwrdCd, String rwrdYmd, String rwrdNm,
                                      String cntrbCn, Long atchFileSn) {
        return new RewardManage(rwrdSn, rwrdUserId, rwrdCd, rwrdYmd, rwrdNm, cntrbCn, atchFileSn);
    }

    /** 화면이 편집하는 다섯 필드를 갱신한다(2026-09-05 DEC-OPS-036 — 종전 3필드 시그니처는 호출부가 0건이었다). */
    public void update(String rwrdUserId, String rwrdCd, String rwrdYmd, String rwrdNm, String cntrbCn) {
        update(rwrdUserId, rwrdCd, rwrdYmd, rwrdNm, cntrbCn, this.atchFileSn);
    }

    public void update(String rwrdUserId, String rwrdCd, String rwrdYmd, String rwrdNm, String cntrbCn, Long atchFileSn) {
        this.rwrdUserId = rwrdUserId;
        this.rwrdCd = rwrdCd;
        this.rwrdYmd = rwrdYmd;
        this.rwrdNm = rwrdNm;
        this.cntrbCn = cntrbCn;
        this.atchFileSn = atchFileSn;
    }
}
