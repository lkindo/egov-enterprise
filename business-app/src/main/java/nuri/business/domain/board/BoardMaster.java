package nuri.business.domain.board;

import org.hibernate.annotations.DynamicUpdate;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 게시판 마스터 엔티티 (TB_BBS_MASTER)
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder}/{@code @AllArgsConstructor} 를 제거하고,
 * 빌더는 정적 팩토리 {@link #create}에 {@code @Builder} 로 배치한다. 컬럼 기본값(useYn="Y" 등)은 팩토리에서
 * 재현하고, 감사 필드는 표준 Auditing 파이프라인에 위임한다. {@code option} 연관은 빌더가 아닌
 * {@link #registerOption}으로 관리한다. (참고: 클래스 레벨 {@code @Setter} 제거는 후속 단계)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_bbs_master")
@DynamicUpdate
public class BoardMaster extends BaseEntity {

    @Id
    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(nullable = false, length = 100)
    private String bbsTtl;

    @Column(length = 4000)
    private String bbsExpln;

    @Column(length = 12, nullable = false)
    private String bbsTypeCd;

    @Column(length = 12, nullable = false)
    private String bbsAtrbCd;

    @Column(length = 1)
    private String ansPsbltyYn = "N";

    @Column(length = 1, nullable = false)
    private String fileAtchPsbltyYn = "N";

    @Column(nullable = false)
    private Integer atchPsbltyFileQty = 0;

    private Long atchPsbltyFileSz;

    @Column(nullable = false, length = 1)
    private String useYn = "Y";

    @Column(length = 20)
    private String tmpltId;

    @Column(length = 20)
    private String blogId;

    @Column(length = 1)
    private String blogYn = "N";

    @Column(length = 20)
    private String cmntyId;

    // --- [OneToOne 지연 로딩 관계 전환] ---
    @OneToOne(mappedBy = "boardMaster", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private BoardMasterOption option;

    // --- [JPA Mapping] ---
    @Column(length = 1, nullable = false)
    private String ansYn = "N";

    @Column(length = 1, nullable = false)
    private String stsfdgYn = "N";

    private BoardMaster(String bbsId, String bbsTtl, String bbsExpln, String bbsTypeCd, String bbsAtrbCd,
            String ansPsbltyYn, String fileAtchPsbltyYn, Integer atchPsbltyFileQty, Long atchPsbltyFileSz,
            String useYn, String tmpltId, String blogId, String blogYn, String cmntyId,
            String ansYn, String stsfdgYn) {
        this.bbsId = bbsId;
        this.bbsTtl = bbsTtl;
        this.bbsExpln = bbsExpln;
        this.bbsTypeCd = bbsTypeCd;
        this.bbsAtrbCd = bbsAtrbCd;
        // 기존 @Builder.Default 재현 (미지정 시 기본값)
        this.ansPsbltyYn = ansPsbltyYn != null ? ansPsbltyYn : "N";
        this.fileAtchPsbltyYn = fileAtchPsbltyYn != null ? fileAtchPsbltyYn : "N";
        this.atchPsbltyFileQty = atchPsbltyFileQty != null ? atchPsbltyFileQty : 0;
        this.atchPsbltyFileSz = atchPsbltyFileSz;
        this.useYn = useYn != null ? useYn : "Y";
        this.tmpltId = tmpltId;
        this.blogId = blogId;
        this.blogYn = blogYn != null ? blogYn : "N";
        this.cmntyId = cmntyId;
        this.ansYn = ansYn != null ? ansYn : "N";
        this.stsfdgYn = stsfdgYn != null ? stsfdgYn : "N";
    }

    /**
     * 게시판 마스터 생성 정적 팩토리(빌더 진입점). {@code BoardMaster.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static BoardMaster create(String bbsId, String bbsTtl, String bbsExpln, String bbsTypeCd, String bbsAtrbCd,
            String ansPsbltyYn, String fileAtchPsbltyYn, Integer atchPsbltyFileQty, Long atchPsbltyFileSz,
            String useYn, String tmpltId, String blogId, String blogYn, String cmntyId,
            String ansYn, String stsfdgYn) {
        return new BoardMaster(bbsId, bbsTtl, bbsExpln, bbsTypeCd, bbsAtrbCd, ansPsbltyYn, fileAtchPsbltyYn,
                atchPsbltyFileQty, atchPsbltyFileSz, useYn, tmpltId, blogId, blogYn, cmntyId, ansYn, stsfdgYn);
    }

    public void registerOption(String ansYn, String stsfdgYn) {
        this.ansYn = ansYn != null ? ansYn : "N";
        this.stsfdgYn = stsfdgYn != null ? stsfdgYn : "N";
        this.option = BoardMasterOption.builder()
                .boardMaster(this)
                .bbsId(this.bbsId)
                .ansYn(this.ansYn)
                .stsfdgYn(this.stsfdgYn)
                .build();
    }

    public void update(String bbsTtl, String bbsExpln, String ansPsbltyYn, String fileAtchPsbltyYn,
            Integer atchPsbltyFileQty, Long atchPsbltyFileSz, String tmpltId, String useYn,
            String ansYn, String stsfdgYn) {
        this.bbsTtl = bbsTtl;
        this.bbsExpln = bbsExpln;
        this.ansPsbltyYn = ansPsbltyYn;
        this.fileAtchPsbltyYn = fileAtchPsbltyYn;
        this.atchPsbltyFileQty = atchPsbltyFileQty;
        this.atchPsbltyFileSz = atchPsbltyFileSz;
        this.tmpltId = tmpltId;
        this.useYn = useYn;
        this.ansYn = ansYn;
        this.stsfdgYn = stsfdgYn;

        syncOption();
    }

    /**
     * ansYn/stsfdgYn 값을 BoardMasterOption 과 정합하게 동기화한다.
     * option 이 아직 없으면 registerOption 으로 생성하여 update() 와 부분 setter
     * (updateAnsYn/updateStsfdgYn) 가 동일한 정합성 정책을 갖도록 보장한다.
     */
    private void syncOption() {
        // BoardMaster 컬럼(nullable=false) 방어 및 Option 과의 값 일치 보장
        this.ansYn = this.ansYn != null ? this.ansYn : "N";
        this.stsfdgYn = this.stsfdgYn != null ? this.stsfdgYn : "N";
        if (this.option != null) {
            this.option.changeAnsYn(this.ansYn);
            this.option.changeStsfdgYn(this.stsfdgYn);
        } else {
            registerOption(this.ansYn, this.stsfdgYn);
        }
    }

    public void updateBbsTtl(String bbsTtl) { this.bbsTtl = bbsTtl; }
    public void updateBbsExpln(String bbsExpln) { this.bbsExpln = bbsExpln; }
    public void updateAnsPsbltyYn(String ansPsbltyYn) { this.ansPsbltyYn = ansPsbltyYn; }
    public void updateFileAtchPsbltyYn(String fileAtchPsbltyYn) { this.fileAtchPsbltyYn = fileAtchPsbltyYn; }
    public void updateAtchPsbltyFileQty(Integer atchPsbltyFileQty) { this.atchPsbltyFileQty = atchPsbltyFileQty; }
    public void updateAtchPsbltyFileSz(Long atchPsbltyFileSz) { this.atchPsbltyFileSz = atchPsbltyFileSz; }
    public void updateTmpltId(String tmpltId) { this.tmpltId = tmpltId; }
    public void updateUseYn(String useYn) { this.useYn = useYn; }
    public void updateAnsYn(String ansYn) {
        this.ansYn = ansYn;
        syncOption();
    }
    public void updateStsfdgYn(String stsfdgYn) {
        this.stsfdgYn = stsfdgYn;
        syncOption();
    }

    public void delete() {
        this.useYn = "N";
    }
}
