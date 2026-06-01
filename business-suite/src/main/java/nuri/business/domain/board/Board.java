package nuri.business.domain.board;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.io.Serializable;

/**
 * 게시물 엔티티 (v5 standardized)
 * - DB Schema Sync: TB_BBS_ITEM (pst_id as VARCHAR)
 */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_bbs_item")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SQLRestriction("use_yn = 'Y'")
@SuperBuilder
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

    @Builder.Default
    private Integer ansLvl = 0;

    @Builder.Default
    private Integer inqCnt = 0;

    @Column(length = 1)
    @Builder.Default
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
    @Builder.Default
    private String qnaSttsCd = "OPEN";

    @Column(length = 12)
    private String qnaCatCd;

    @Builder.Default
    private Integer likeCnt = 0;
    
    @Column(length = 1)
    @Builder.Default
    private String ansYn = "N";

    @Column(length = 1)
    @Builder.Default
    private String ntcYn = "N";

    @Column(name = "cmnt_cnt")
    @Builder.Default
    private Integer cmntCnt = 0;
    
    @Builder.Default
    private Integer fileCnt = 0;

    @Builder.Default
    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<nuri.business.domain.comment.Comment> comments = new java.util.ArrayList<>();

    @Version
    private Integer version;

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

    // aliases
    public String getNttId() { return pstId; }
    public String getNttSj() { return pstTtl; }
    public String getNttCn() { return pstCn; }
    public Long getNttNo() { return ansSn; }
    public String getNtcrId() { return userId; }
    public String getNtcrNm() { return userNm; }
    public String getPassword() { return pswd; }
    public String getNtceBgngYmd() { return pstBgngYmd; }
    public String getNtceEndYmd() { return pstEndYmd; }
    public Integer getInqireCo() { return inqCnt; }
    public Integer getLikeCo() { return likeCnt; }
    public String getQnaStatus() { return qnaSttsCd; }
    public String getQnaCategory() { return qnaCatCd; }
    public String getSjBoldYn() { return ttlBoldYn; }
    public String getParnts() { return upPstId; }

    public void setNttId(String v) { this.pstId = v; }
    public void setNttSj(String v) { this.pstTtl = v; }
    public void setNttCn(String v) { this.pstCn = v; }
    public void setNttNo(Long v) { this.ansSn = v; }
    public void setNtcrId(String v) { this.userId = v; }
    public void setNtcrNm(String v) { this.userNm = v; }
    public void setPassword(String v) { this.pswd = v; }
    public void setNtceBgngYmd(String v) { this.pstBgngYmd = v; }
    public void setNtceEndYmd(String v) { this.pstEndYmd = v; }
    public void setInqireCo(Integer v) { this.inqCnt = v; }
    public void setLikeCo(Integer v) { this.likeCnt = v; }
    public void setQnaStatus(String v) { this.qnaSttsCd = v; }
    public void setQnaCategory(String v) { this.qnaCatCd = v; }
    public void setSjBoldYn(String v) { this.ttlBoldYn = v; }
    public void setParnts(String v) { this.upPstId = v; }

    // legacy aliases for frontend compatibility
    public String getAnswerAt() { return ansYn; }
    public void setAnswerAt(String v) { this.ansYn = v; }
    public String getNoticeAt() { return ntcYn; }
    public void setNoticeAt(String v) { this.ntcYn = v; }

    public Integer getCommentCnt() { return cmntCnt; }
    public void setCommentCnt(Integer v) { this.cmntCnt = v; }
}
