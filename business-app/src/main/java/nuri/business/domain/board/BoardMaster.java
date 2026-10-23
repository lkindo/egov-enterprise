package nuri.business.domain.board;

import org.hibernate.annotations.DynamicUpdate;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigInteger;

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

    /**
     * 낙관적 잠금 버전(V2_139, ADR-0040 결정 10). 화면이 읽은 값과 다르면 다른 사람이 먼저 고친 것이다(서비스가 409 로 거부한다).
     * 일괄 사용 상태 변경·단건 비활성화도 이 값을 올리므로, 그 사이에 열어 둔 설정 저장은 409 가 된다.
     */
    @Version
    private Integer version;

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

    @Column(name = "cmnty_sn")
    private Long cmntySn;

    // --- [OneToOne 지연 로딩 관계 전환] ---
    @OneToOne(mappedBy = "boardMaster", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private BoardMasterOption option;

    // --- [JPA Mapping] ---
    @Column(length = 1, nullable = false)
    private String ansYn = "Y";

    @Column(length = 1, nullable = false)
    private String stsfdgYn = "Y";

    /**
     * 예약 게시(V2_140, ADR-0040 결정 3·6). Y 면 새 글의 미래 게시 시작일을 받는다. 노출을 늦추는 집행은 이 값과 무관하게 늘
     * 한다 — 이 값은 새 미래 시작일을 받을지만 정하고, 바꿔도 이미 있는 글의 노출은 바뀌지 않는다. 기존 게시판 기본값은 N 이다.
     */
    @Column(name = "rsvt_pstg_psblty_yn", length = 1, nullable = false)
    private String rsvtPstgPsbltyYn = "N";

    /** 상단 고정 정책 기본값(V2_141 의 DEFAULT 와 같다) — 상한 5건, 종료일을 비운 고정은 30일. */
    public static final BigInteger DEFAULT_PIN_LIMIT = BigInteger.valueOf(5);
    public static final BigInteger DEFAULT_PIN_DAYS = BigInteger.valueOf(30);

    /**
     * 상단 고정 허용(V2_141, ADR-0040 결정 5·6). Y 면 새 고정을 받는다. 꺼도 이미 고정된 글은 종료일까지 그대로이고 해제는 언제나
     * 된다 — 이 값은 새 고정만 막는다. 기존 게시판 기본값은 N 이다.
     */
    @Column(name = "upend_fix_psblty_yn", length = 1, nullable = false)
    private String upendFixPsbltyYn = "N";

    /**
     * 고정 중인 글 수의 상한(numeric(10), V2_141). 새 고정만 이 상한을 따른다 — 낮춰도 이미 고정된 글은 그대로다. 표준 도메인
     * 수N10 이 numeric 이라 {@code BigInteger} 로 매핑한다(Integer 면 스키마 검증이 numeric 과 어긋난다, DurableJob 선례).
     */
    @Column(name = "upend_fix_uplmt_nocs", precision = 10, scale = 0, nullable = false)
    private BigInteger upendFixUplmtNocs = DEFAULT_PIN_LIMIT;

    /** 종료일을 비우고 고정할 때 오늘부터 고정을 유지하는 일수(numeric(7), V2_141). */
    @Column(name = "upend_fix_bsc_day_cnt", precision = 7, scale = 0, nullable = false)
    private BigInteger upendFixBscDayCnt = DEFAULT_PIN_DAYS;

    /**
     * 비밀글 정책 값(V2_142 CHECK, ADR-0040 결정 7). 요청 DTO 의 허용값·화면 선택지와 같은 집합이다.
     * NONE 은 작성 화면에 선택이 없고 서버가 요청값을 그대로 저장한다(지금 동작), OPTIONAL 은 글쓴이가 고른다(서버 동작은 NONE 과
     * 같다), REQUIRED 는 서버가 새 글과 고친 글을 늘 비밀글로 저장한다.
     */
    public static final String PRIVATE_POST_NONE = "NONE";
    public static final String PRIVATE_POST_OPTIONAL = "OPTIONAL";
    public static final String PRIVATE_POST_REQUIRED = "REQUIRED";

    /**
     * 비밀글 정책(V2_142, ADR-0040 결정 6·7). 바꿔도 이미 있는 글의 비밀 여부는 그대로다 — 정책은 앞으로 저장하는 글에만 적용된다.
     * 기존 게시판 기본값은 NONE 이다(Q&A 게시판도 NONE — 도움말 1:1 문의는 비밀, 지식 허브 질의응답은 공개).
     */
    @Column(name = "prvt_pst_plcy_cd", length = 12, nullable = false)
    private String prvtPstPlcyCd = PRIVATE_POST_NONE;

    /**
     * 추천 받기(V2_142, 기존 용어 RCMDTN_USE_YN, ADR-0040 결정 6). N 이면 새 추천을 받지 않는다. 이미 받은 추천 수는 그대로이고
     * 각자 자기 추천 취소는 받는다. 기존 게시판 기본값은 Y(지금 모든 게시판이 추천을 받는다)다.
     */
    @Column(name = "rcmdtn_use_yn", length = 1, nullable = false)
    private String rcmdtnUseYn = "Y";

    private BoardMaster(String bbsId, String bbsTtl, String bbsExpln, String bbsTypeCd, String bbsAtrbCd,
            String ansPsbltyYn, String fileAtchPsbltyYn, Integer atchPsbltyFileQty, Long atchPsbltyFileSz,
            String useYn, String tmpltId, Long cmntySn,
            String ansYn, String stsfdgYn, String rsvtPstgPsbltyYn,
            String upendFixPsbltyYn, BigInteger upendFixUplmtNocs, BigInteger upendFixBscDayCnt,
            String prvtPstPlcyCd, String rcmdtnUseYn) {
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
        this.cmntySn = cmntySn;
        // [2026-09-27 DIP B5 F9] 댓글·만족도 설정을 집행하면서 기본값을 지금까지의 실제 동작(받음)인 Y 로 둔다.
        //   종전 기본값 N 은 읽히지 않았으므로 값을 보내지 않는 호출부의 동작이 바뀌지 않는다.
        this.ansYn = ansYn != null ? ansYn : "Y";
        this.stsfdgYn = stsfdgYn != null ? stsfdgYn : "Y";
        this.rsvtPstgPsbltyYn = "Y".equals(rsvtPstgPsbltyYn) ? "Y" : "N";
        // [ADR-0040 결정 5·6] 비우면 고정 안 받음·5건·30일(마이그레이션 기본값과 같다).
        this.upendFixPsbltyYn = "Y".equals(upendFixPsbltyYn) ? "Y" : "N";
        this.upendFixUplmtNocs = upendFixUplmtNocs != null ? upendFixUplmtNocs : DEFAULT_PIN_LIMIT;
        this.upendFixBscDayCnt = upendFixBscDayCnt != null ? upendFixBscDayCnt : DEFAULT_PIN_DAYS;
        // [ADR-0040 결정 6·7] 비우면 비밀글 정책 NONE·추천 받음(마이그레이션 기본값과 같다).
        this.prvtPstPlcyCd = prvtPstPlcyCd != null ? prvtPstPlcyCd : PRIVATE_POST_NONE;
        this.rcmdtnUseYn = "N".equals(rcmdtnUseYn) ? "N" : "Y";
    }

    /**
     * 게시판 마스터 생성 정적 팩토리(빌더 진입점). {@code BoardMaster.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static BoardMaster create(String bbsId, String bbsTtl, String bbsExpln, String bbsTypeCd, String bbsAtrbCd,
            String ansPsbltyYn, String fileAtchPsbltyYn, Integer atchPsbltyFileQty, Long atchPsbltyFileSz,
            String useYn, String tmpltId, Long cmntySn,
            String ansYn, String stsfdgYn, String rsvtPstgPsbltyYn,
            String upendFixPsbltyYn, BigInteger upendFixUplmtNocs, BigInteger upendFixBscDayCnt,
            String prvtPstPlcyCd, String rcmdtnUseYn) {
        return new BoardMaster(bbsId, bbsTtl, bbsExpln, bbsTypeCd, bbsAtrbCd, ansPsbltyYn, fileAtchPsbltyYn,
                atchPsbltyFileQty, atchPsbltyFileSz, useYn, tmpltId, cmntySn, ansYn, stsfdgYn, rsvtPstgPsbltyYn,
                upendFixPsbltyYn, upendFixUplmtNocs, upendFixBscDayCnt, prvtPstPlcyCd, rcmdtnUseYn);
    }

    public void registerOption(String ansYn, String stsfdgYn) {
        this.ansYn = ansYn != null ? ansYn : "Y";
        this.stsfdgYn = stsfdgYn != null ? stsfdgYn : "Y";
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
     * option 이 아직 없으면 registerOption 으로 생성하여 update() 가 registerOption 과
     * 동일한 정합성 정책을 갖도록 보장한다.
     */
    private void syncOption() {
        // BoardMaster 컬럼(nullable=false) 방어 및 Option 과의 값 일치 보장
        this.ansYn = this.ansYn != null ? this.ansYn : "Y";
        this.stsfdgYn = this.stsfdgYn != null ? this.stsfdgYn : "Y";
        if (this.option != null) {
            this.option.changeAnsYn(this.ansYn);
            this.option.changeStsfdgYn(this.stsfdgYn);
        } else {
            registerOption(this.ansYn, this.stsfdgYn);
        }
    }

    public void updateUseYn(String useYn) { this.useYn = useYn; }

    /**
     * 예약 게시 설정을 바꾼다(ADR-0040 결정 3·6). Y 밖의 값은 N 이다. 이미 있는 글은 손대지 않는다 — 설정은 새 미래 시작일을
     * 받을지만 정한다. {@link #update} 의 인자를 늘리지 않으려고 따로 둔다(호출부·시험 보존).
     */
    public void changeReservation(String rsvtPstgPsbltyYn) {
        this.rsvtPstgPsbltyYn = "Y".equals(rsvtPstgPsbltyYn) ? "Y" : "N";
    }

    /**
     * 상단 고정 정책을 바꾼다(ADR-0040 결정 5·6). 허용은 Y 밖의 값이 N 이고, 상한·기본 일수는 null 이면 지금 값을 둔다. 이미 고정된
     * 글은 손대지 않는다 — 정책은 새 고정만 정한다. {@link #update} 의 인자를 늘리지 않으려고 따로 둔다.
     */
    public void changePinPolicy(String upendFixPsbltyYn, BigInteger upendFixUplmtNocs, BigInteger upendFixBscDayCnt) {
        this.upendFixPsbltyYn = "Y".equals(upendFixPsbltyYn) ? "Y" : "N";
        if (upendFixUplmtNocs != null) {
            this.upendFixUplmtNocs = upendFixUplmtNocs;
        }
        if (upendFixBscDayCnt != null) {
            this.upendFixBscDayCnt = upendFixBscDayCnt;
        }
    }

    /**
     * 비밀글 정책과 추천 받기를 바꾼다(ADR-0040 결정 6·7). null 이면 지금 값을 둔다. 이미 있는 글의 비밀 여부·추천 수는 손대지
     * 않는다 — 정책은 앞으로 저장하는 글과 새 추천에만 적용된다. {@link #update} 의 인자를 늘리지 않으려고 따로 둔다.
     */
    public void changePostPolicies(String prvtPstPlcyCd, String rcmdtnUseYn) {
        if (prvtPstPlcyCd != null) {
            this.prvtPstPlcyCd = prvtPstPlcyCd;
        }
        if (rcmdtnUseYn != null) {
            this.rcmdtnUseYn = "N".equals(rcmdtnUseYn) ? "N" : "Y";
        }
    }

    /** 서버가 이 게시판의 글을 늘 비밀글로 저장하는가(비밀글 정책 REQUIRED, ADR-0040 결정 7). */
    public boolean requiresPrivatePosts() {
        return PRIVATE_POST_REQUIRED.equals(prvtPstPlcyCd);
    }

    /** 이 게시판이 새 추천을 받는가(추천 받기 N 이 아닌가, ADR-0040 결정 6). 추천 취소는 이 값과 무관하다. */
    public boolean acceptsRecommendations() {
        return !"N".equals(rcmdtnUseYn);
    }

    public void delete() {
        this.useYn = "N";
    }
}
