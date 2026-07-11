package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.io.Serializable;

/**
 * 게시물 엔티티 (v5 standardized)
 * - DB Schema Sync: TB_BBS_ITEM (pst_id as VARCHAR)
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder}/{@code @AllArgsConstructor} 를 제거하고,
 * 빌더는 정적 팩토리 {@link #create}에 {@code @Builder} 로 배치한다. 컬럼 기본값(useYn="Y", qnaSttsCd="OPEN" 등)은
 * 팩토리에서 재현하고, 감사 필드는 표준 Auditing 파이프라인에 위임한다. 연관(boardMaster/fileMaster),
 * comments 컬렉션, {@code @Version} 은 빌더에서 제외한다. (참고: 클래스 레벨 {@code @Setter} 제거는 후속 단계)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_bbs_item")
@Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")
public class Board extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "pst_id", length = 20)
    private String pstId;

    @Column(name = "bbs_id", nullable = false, length = 20)
    private String bbsId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bbs_id", referencedColumnName = "bbs_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private BoardMaster boardMaster;

    private Long ansSn;

    @Column(length = 100)
    private String pstTtl;

    @Column(length = 4000)
    private String pstCn;

    @Column(length = 20)
    private String upPstId;

    private Long sortOrdr;

    @Column(length = 1)
    private String ttlBoldYn;

    private Integer ansLv = 0;

    private Integer inqCnt = 0;

    @Column(length = 1)
    private String useYn = "Y";

    @Column(length = 20)
    private String pstBgngYmd;

    @Column(length = 20)
    private String pstEndYmd;

    @Column(length = 20)
    private String userId;

    @Column(length = 100)
    private String userNm;

    @Column(length = 200)
    private String pswd;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @Column(length = 1)
    private String scrtYn;

    @Column(length = 20)
    private String blogId;

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

    private Integer cmntCnt = 0;

    private Integer fileCnt = 0;

    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<nuri.business.domain.comment.Comment> comments = new java.util.ArrayList<>();

    @Version
    private Integer version;

    private Board(String pstId, String bbsId, Long ansSn, String pstTtl, String pstCn, String upPstId,
            Long sortOrdr, String ttlBoldYn, Integer ansLv, Integer inqCnt, String useYn,
            String pstBgngYmd, String pstEndYmd, String userId, String userNm, String pswd,
            String atchFileId, String scrtYn, String blogId, java.time.LocalDateTime evntDt,
            String qnaSttsCd, String qnaCatCd, Integer likeCnt, String ansYn, String ntcYn,
            Integer cmntCnt, Integer fileCnt) {
        this.pstId = pstId;
        this.bbsId = bbsId;
        this.ansSn = ansSn;
        this.pstTtl = pstTtl;
        this.pstCn = pstCn;
        this.upPstId = upPstId;
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
        this.atchFileId = atchFileId;
        this.scrtYn = scrtYn;
        this.blogId = blogId;
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
    public static Board create(String pstId, String bbsId, Long ansSn, String pstTtl, String pstCn, String upPstId,
            Long sortOrdr, String ttlBoldYn, Integer ansLv, Integer inqCnt, String useYn,
            String pstBgngYmd, String pstEndYmd, String userId, String userNm, String pswd,
            String atchFileId, String scrtYn, String blogId, java.time.LocalDateTime evntDt,
            String qnaSttsCd, String qnaCatCd, Integer likeCnt, String ansYn, String ntcYn,
            Integer cmntCnt, Integer fileCnt) {
        return new Board(pstId, bbsId, ansSn, pstTtl, pstCn, upPstId, sortOrdr, ttlBoldYn, ansLv, inqCnt, useYn,
                pstBgngYmd, pstEndYmd, userId, userNm, pswd, atchFileId, scrtYn, blogId, evntDt,
                qnaSttsCd, qnaCatCd, likeCnt, ansYn, ntcYn, cmntCnt, fileCnt);
    }

    public void update(String pstTtl, String pstCn, String userId, String userNm, String pswd, String pstBgngYmd,
            String pstEndYmd, String atchFileId, java.time.LocalDateTime evntDt, String qnaSttsCd, String qnaCatCd, String scrtYn) {
        this.pstTtl = pstTtl;
        this.pstCn = pstCn;
        this.userId = userId;
        this.userNm = userNm;
        this.pswd = pswd;
        this.pstBgngYmd = pstBgngYmd;
        this.pstEndYmd = pstEndYmd;
        this.atchFileId = atchFileId;
        this.evntDt = evntDt;
        this.qnaSttsCd = qnaSttsCd;
        this.qnaCatCd = qnaCatCd;
        this.scrtYn = scrtYn;
    }

    public void delete() {
        this.useYn = "N";
    }

    public void increaseInqCnt() {
        if (this.inqCnt == null) {
            this.inqCnt = 0;
        }
        this.inqCnt++;
    }

    public void updateReplyOrder(Long ansSn) {
        this.ansSn = ansSn;
    }

    public void increaseLikeCnt() {
        if (this.likeCnt == null) {
            this.likeCnt = 0;
        }
        this.likeCnt++;
    }

    public void changePstId(String pstId) {
        this.pstId = pstId;
    }

    public void changeInqCnt(Integer inqCnt) {
        this.inqCnt = inqCnt;
    }

    public void changeCmntCnt(Integer cmntCnt) {
        this.cmntCnt = cmntCnt;
    }

    public void changeFileCnt(Integer fileCnt) {
        this.fileCnt = fileCnt;
    }
}
