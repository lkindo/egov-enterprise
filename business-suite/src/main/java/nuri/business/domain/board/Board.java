package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
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

    @Column(name = "bbs_id", nullable = false)
    private String bbsId;

    @Column(name = "ans_sn")
    private Long pstSn;

    @Column(name = "pst_ttl", length = 2000)
    private String pstTtl;

    @Column(name = "pst_cn")
    private String pstCn;

    @Column(name = "up_pst_id", length = 20)
    private String upPstId;

    @Column(name = "sort_ordr")
    private Long sortOrdr;

    @Column(name = "ttl_bold_yn", length = 1)
    private String ttlBoldYn;

    @Column(name = "ans_lvl")
    @Builder.Default
    private Integer replyLc = 0;

    @Column(name = "inq_cnt")
    @Builder.Default
    private Integer inqCnt = 0;

    @Column(name = "use_yn", length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "pst_bgng_ymd", length = 20)
    private String bgngYmd;

    @Column(name = "pst_end_ymd", length = 20)
    private String endYmd;

    @Column(name = "user_id", length = 20)
    private String userId;

    @Column(name = "user_nm", length = 20)
    private String userNm;

    @Column(name = "pswd", length = 200)
    private String pswd;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "scrt_yn", length = 1)
    private String secretYn;

    @Column(name = "blog_id", length = 20)
    private String blogId;

    @Column(name = "evnt_dt")
    private java.time.LocalDateTime eventDate;

    @Column(name = "qna_stts_cd", length = 10)
    @Builder.Default
    private String qnaSttsCd = "OPEN";

    @Column(name = "qna_cat_cd", length = 50)
    private String qnaCatCd;

    @Column(name = "like_cnt")
    @Builder.Default
    private Integer likeCnt = 0;
    
    @Transient
    @Builder.Default
    private Integer commentCnt = 0;
    
    @Transient
    @Builder.Default
    private Integer fileCnt = 0;

    public void update(String pstTtl, String pstCn, String userId, String userNm, String pswd, String bgngYmd,
            String endYmd, String atchFileId, java.time.LocalDateTime eventDate, String qnaSttsCd, String qnaCatCd, String secretYn) {
        this.pstTtl = pstTtl;
        this.pstCn = pstCn;
        this.userId = userId;
        this.userNm = userNm;
        this.pswd = pswd;
        this.bgngYmd = bgngYmd;
        this.endYmd = endYmd;
        this.atchFileId = atchFileId;
        this.eventDate = eventDate;
        this.qnaSttsCd = qnaSttsCd;
        this.qnaCatCd = qnaCatCd;
        this.secretYn = secretYn;
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

    public void updateReplyOrder(Long pstSn) {
        this.pstSn = pstSn;
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
    public Long getNttNo() { return pstSn; }
    public String getNtcrId() { return userId; }
    public String getNtcrNm() { return userNm; }
    public String getPassword() { return pswd; }
    public String getNtceBgngYmd() { return bgngYmd; }
    public String getNtceEndYmd() { return endYmd; }
    public Integer getInqireCo() { return inqCnt; }
    public Integer getLikeCo() { return likeCnt; }
    public String getQnaStatus() { return qnaSttsCd; }
    public String getQnaCategory() { return qnaCatCd; }
    public String getSjBoldYn() { return ttlBoldYn; }
    public String getParnts() { return upPstId; }

    public void setNttId(String v) { this.pstId = v; }
    public void setNttSj(String v) { this.pstTtl = v; }
    public void setNttCn(String v) { this.pstCn = v; }
    public void setNttNo(Long v) { this.pstSn = v; }
    public void setNtcrId(String v) { this.userId = v; }
    public void setNtcrNm(String v) { this.userNm = v; }
    public void setPassword(String v) { this.pswd = v; }
    public void setNtceBgngYmd(String v) { this.bgngYmd = v; }
    public void setNtceEndYmd(String v) { this.endYmd = v; }
    public void setInqireCo(Integer v) { this.inqCnt = v; }
    public void setLikeCo(Integer v) { this.likeCnt = v; }
    public void setQnaStatus(String v) { this.qnaSttsCd = v; }
    public void setQnaCategory(String v) { this.qnaCatCd = v; }
    public void setSjBoldYn(String v) { this.ttlBoldYn = v; }
    public void setParnts(String v) { this.upPstId = v; }
}
