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
@Table(name = "TB_BBS_ITEM")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SQLRestriction("use_yn = 'Y'")
@SuperBuilder
public class Board extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "PST_ID", length = 20)
    private String pstId;

    @Column(name = "BBS_ID", nullable = false)
    private String bbsId;

    @Column(name = "REPLY_SN")
    private Long pstSn;

    @Column(name = "PST_TTL", length = 2000)
    private String pstTtl;

    @Column(name = "PST_CN")
    private String pstCn;

    @Column(name = "UP_PST_ID", length = 20)
    private String upPstId;

    @Column(name = "SORT_ORDR")
    private Long sortOrdr;

    @Column(name = "SJ_BOLD_YN", length = 1)
    private String ttlBoldYn;

    @Column(name = "REPLY_LC")
    @Builder.Default
    private Integer replyLc = 0;

    @Column(name = "INQ_CNT")
    @Builder.Default
    private Integer inqCnt = 0;

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "PST_BGN_YMD", length = 20)
    private String bgngYmd;

    @Column(name = "PST_END_YMD", length = 20)
    private String endYmd;

    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "USER_NM", length = 20)
    private String userNm;

    @Column(name = "PSWD", length = 200)
    private String pswd;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "SECRET_YN", length = 1)
    private String secretYn;

    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "EVENT_DATE")
    private java.time.LocalDateTime eventDate;

    @Column(name = "QNA_STTS_CD", length = 10)
    @Builder.Default
    private String qnaSttsCd = "OPEN";

    @Column(name = "QNA_CAT_CD", length = 50)
    private String qnaCatCd;

    @Column(name = "LIKE_CNT")
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
