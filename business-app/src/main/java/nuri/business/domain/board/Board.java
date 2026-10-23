package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.io.Serializable;

/**
 * 게시물 엔티티 (v5 standardized)
 * - DB Schema Sync: TB_BBS_ITEM (pst_sn as BIGINT IDENTITY)
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder}/{@code @AllArgsConstructor} 를 제거하고,
 * 빌더는 정적 팩토리 {@link #create}에 {@code @Builder} 로 배치한다. 컬럼 기본값(useYn="Y", qnaSttsCd="OPEN" 등)은
 * 팩토리에서 재현하고, 감사 필드는 표준 Auditing 파이프라인에 위임한다. 연관(boardMaster/fileMaster),
 * comments 컬렉션, {@code @Version} 은 빌더에서 제외한다. (참고: 클래스 레벨 {@code @Setter} 제거는 후속 단계)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_bbs_item", uniqueConstraints = {
    @UniqueConstraint(
        name = "uk_tb_bbs_item_thread_pos",
        columnNames = {"bbs_id", "sort_ordr", "ans_sn"}
    )
})
@Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")
// [W1-17] 변경된 컬럼만 UPDATE 한다.
//   조회수·좋아요는 원자 네이티브 UPDATE 로 빠졌지만, 그것만으로는 부족하다 —
//   편집자가 엔티티를 저장하면 전(全)컬럼 UPDATE 가 나가면서 **자기 트랜잭션 시작 시점의 inqCnt** 를
//   되써, 편집 중에 쌓인 조회수를 지운다. 변경 컬럼만 쓰면 그 손실창이 사라진다.
//   같은 패키지 BoardMaster 에 선례가 있다.
@org.hibernate.annotations.DynamicUpdate
public class Board extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pst_sn")
    private Long pstSn;

    @Column(name = "bbs_id", nullable = false, length = 20)
    private String bbsId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bbs_id", referencedColumnName = "bbs_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private BoardMaster boardMaster;

    private Long ansSn;

    @Column(length = 256)
    private String pstTtl;

    @Column(length = 4000)
    private String pstCn;

    @Column(name = "up_pst_sn")
    private Long upPstSn;

    private Long sortOrdr;

    @Column(length = 1)
    private String ttlBoldYn;

    private Integer ansLv = 0;

    private Integer inqCnt = 0;

    @Column(length = 1)
    private String useYn = "Y";

    @Column(length = 8)
    private String pstBgngYmd;

    @Column(length = 8)
    private String pstEndYmd;

    @Column(length = 20)
    private String userId;

    @Column(length = 100)
    private String userNm;

    @Column(length = 256)
    private String pswd;
    @Column(name = "atch_file_sn")
    private Long atchFileSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_sn", referencedColumnName = "atch_file_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @Column(length = 1)
    private String scrtYn;

    private java.time.LocalDateTime evntDt;

    @Column(length = 12)
    private String qnaSttsCd = "OPEN";

    @Column(length = 12)
    private String qnaCatCd;

    private Integer likeCnt = 0;

    @Column(length = 1)
    private String ansYn = "N";

    @Column(length = 1)
    private String ntcYn = "N";

    /**
     * 상단 고정(V2_141, ADR-0040 결정 5). 고정 종료일까지 게시판 목록의 기본·최신순 맨 앞에 둔다. 새 글은 N 이다.
     *
     * <p>{@code updatable = false} — 엔티티 저장(작성자 수정·해결 표시·삭제)은 이 컬럼을 쓰지 않는다. 쓰기는 운영 화면의 고정 경로가
     * 부르는 한 문장 UPDATE({@code BoardRepository#updatePin}) 하나뿐이다. 그래서 고정·해제가 {@code @Version} 을 올리지 않고
     * (그 사이 열어 둔 작성자 수정이 409 가 되지 않는다), 옛 버전으로 저장한 작성자 수정이 고정을 덮지도 않는다.
     * DB 는 NOT NULL DEFAULT 'N' 이다 — 이 파일의 다른 Y/N 컬럼처럼 nullable 을 적지 않는다(엔티티 INSERT 는 늘 값을 싣는다).
     */
    @Column(name = "upend_fix_yn", length = 1, updatable = false)
    private String upendFixYn = "N";

    /** 상단 고정 종료일(yyyyMMdd, V2_141). 고정 중일 때만 있다. 쓰기 경로는 {@link #upendFixYn} 과 같다. */
    @Column(name = "upend_fix_end_ymd", length = 8, updatable = false)
    private String upendFixEndYmd;

    private Integer cmntCnt = 0;

    private Integer fileCnt = 0;

    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<nuri.business.domain.comment.Comment> comments = new java.util.ArrayList<>();

    @Version
    private Integer version;

    private Board(Long pstSn, String bbsId, Long ansSn, String pstTtl, String pstCn, Long upPstSn,
            Long sortOrdr, String ttlBoldYn, Integer ansLv, Integer inqCnt, String useYn,
            String pstBgngYmd, String pstEndYmd, String userId, String userNm, String pswd,
            Long atchFileSn, String scrtYn, java.time.LocalDateTime evntDt,
            String qnaSttsCd, String qnaCatCd, Integer likeCnt, String ansYn, String ntcYn,
            Integer cmntCnt, Integer fileCnt) {
        this.pstSn = pstSn;
        this.bbsId = bbsId;
        this.ansSn = ansSn;
        this.pstTtl = pstTtl;
        this.pstCn = pstCn;
        this.upPstSn = upPstSn;
        this.sortOrdr = sortOrdr;
        this.ttlBoldYn = ttlBoldYn;
        // 기존 @Builder.Default 재현 (미지정 시 기본값)
        this.ansLv = ansLv != null ? ansLv : 0;
        this.inqCnt = inqCnt != null ? inqCnt : 0;
        this.useYn = useYn != null ? useYn : "Y";
        this.pstBgngYmd = pstBgngYmd;
        this.pstEndYmd = pstEndYmd;
        this.userId = userId;
        this.userNm = userNm;
        this.pswd = pswd;
        this.atchFileSn = atchFileSn;
        this.scrtYn = scrtYn;
        this.evntDt = evntDt;
        this.qnaSttsCd = qnaSttsCd != null ? qnaSttsCd : "OPEN";
        this.qnaCatCd = qnaCatCd;
        this.likeCnt = likeCnt != null ? likeCnt : 0;
        this.ansYn = ansYn != null ? ansYn : "N";
        this.ntcYn = ntcYn != null ? ntcYn : "N";
        this.cmntCnt = cmntCnt != null ? cmntCnt : 0;
        this.fileCnt = fileCnt != null ? fileCnt : 0;
    }

    /**
     * 게시물 생성 정적 팩토리(빌더 진입점). {@code Board.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static Board create(Long pstSn, String bbsId, Long ansSn, String pstTtl, String pstCn, Long upPstSn,
            Long sortOrdr, String ttlBoldYn, Integer ansLv, Integer inqCnt, String useYn,
            String pstBgngYmd, String pstEndYmd, String userId, String userNm, String pswd,
            Long atchFileSn, String scrtYn, java.time.LocalDateTime evntDt,
            String qnaSttsCd, String qnaCatCd, Integer likeCnt, String ansYn, String ntcYn,
            Integer cmntCnt, Integer fileCnt) {
        return new Board(pstSn, bbsId, ansSn, pstTtl, pstCn, upPstSn, sortOrdr, ttlBoldYn, ansLv, inqCnt, useYn,
                pstBgngYmd, pstEndYmd, userId, userNm, pswd, atchFileSn, scrtYn, evntDt,
                qnaSttsCd, qnaCatCd, likeCnt, ansYn, ntcYn, cmntCnt, fileCnt);
    }

    public void update(String pstTtl, String pstCn, String userId, String userNm, String pswd, String pstBgngYmd,
            String pstEndYmd, Long atchFileSn, java.time.LocalDateTime evntDt, String qnaSttsCd, String qnaCatCd, String scrtYn) {
        this.pstTtl = pstTtl;
        this.pstCn = pstCn;
        this.userId = userId;
        this.userNm = userNm;
        this.pswd = pswd;
        this.pstBgngYmd = pstBgngYmd;
        this.pstEndYmd = pstEndYmd;
        this.atchFileSn = atchFileSn;
        this.evntDt = evntDt;
        this.qnaSttsCd = qnaSttsCd;
        this.qnaCatCd = qnaCatCd;
        this.scrtYn = scrtYn;
    }

    /**
     * 게시 기간만 바꾼다 — 운영 화면의 빠른 편집·일괄 처리 전용이다(ADR-0040 결정 3·10). 값이 바뀌면 {@code @Version} 이 올라
     * 그 사이 열어 둔 작성자 수정은 409 가 된다(종료일은 작성자 폼과 같은 컬럼이다). 호출부가 형식·순서·권한을 판정한다.
     */
    public void changePostingPeriod(String pstBgngYmd, String pstEndYmd) {
        this.pstBgngYmd = pstBgngYmd;
        this.pstEndYmd = pstEndYmd;
    }

    /** Q&A 해결 상태만 바꾼다 — 본문·작성자 등 다른 필드는 건드리지 않는다(DIP I3). */
    public void markQnaStatus(String qnaSttsCd) {
        this.qnaSttsCd = qnaSttsCd;
    }

    public void delete() {
        this.useYn = "N";
    }
}
