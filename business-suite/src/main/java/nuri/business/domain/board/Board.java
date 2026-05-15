package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.Builder;
import org.hibernate.annotations.SQLRestriction;

import java.io.Serializable;

@Getter
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
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "pstIdSeq")
    @SequenceGenerator(name = "pstIdSeq", sequenceName = "NTT_ID_SEQ", allocationSize = 1)
    @Column(name = "PST_ID")
    private Long pstId;

    @Column(name = "BBS_ID", nullable = false)
    private String bbsId;

    @Column(name = "REPLY_SN")
    private Long pstSn;

    @Column(name = "PST_TTL", length = 2000)
    private String pstTtl;

    @Column(name = "PST_CN")
    private String pstCn;

    @Column(name = "ANSWER_YN", length = 1)
    private String replyYn;

    @Column(name = "UP_PST_ID")
    private Long parnts;

    @Column(name = "ANSWER_LC")
    private Integer replyLc;

    @Column(name = "SORT_ORDR")
    private Long sortOrdr;

    @Column(name = "SJ_BOLD_YN", length = 1)
    private String sjBoldYn;

    @Column(name = "INQ_CNT")
    @Builder.Default
    private Integer inqireCo = 0;

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "NTCE_BGNDE", length = 20)
    private String ntceBgnyYmd;

    @Column(name = "NTCE_ENDDE", length = 20)
    private String ntceEndYmd;

    @Column(name = "NTCR_ID", length = 20)
    private String ntcrId;

    @Column(name = "NTCR_NM", length = 20)
    private String ntcrNm;

    @Column(name = "PASSWORD", length = 200)
    private String password;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "SECRET_YN", length = 1)
    private String secretYn;

    @Column(name = "NOTICE_YN", length = 1)
    private String noticeYn;

    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "EVENT_DATE")
    private java.time.LocalDateTime eventDate;

    @Column(name = "QNA_STATUS", length = 10)
    @Builder.Default
    private String qnaStatus = "OPEN";

    @Column(name = "QNA_CATEGORY", length = 50)
    private String qnaCategory;

    // 반정규화 필드 (성능 최적화용)
    @Column(name = "COMMENT_CO")
    @Builder.Default
    private Integer commentCo = 0;

    @Column(name = "FILE_CO")
    @Builder.Default
    private Integer fileCo = 0;

    @Column(name = "LIKE_CO")
    @Builder.Default
    private Integer likeCo = 0;

    public void update(String pstTtl, String pstCn, String ntcrId, String ntcrNm, String password, String ntceBgnyYmd,
            String ntceEndYmd, String atchFileId, java.time.LocalDateTime eventDate, String qnaStatus, String qnaCategory, String secretYn) {
        this.pstTtl = pstTtl;
        this.pstCn = pstCn;
        this.ntcrId = ntcrId;
        this.ntcrNm = ntcrNm;
        this.password = password;
        this.ntceBgnyYmd = ntceBgnyYmd;
        this.ntceEndYmd = ntceEndYmd;
        this.atchFileId = atchFileId;
        this.eventDate = eventDate;
        this.qnaStatus = qnaStatus;
        this.qnaCategory = qnaCategory;
        this.secretYn = secretYn;
    }

    public void delete() {
        this.useYn = "N";
    }

    public void increaseInqireCo() {
        if (this.inqireCo == null) {
            this.inqireCo = 0;
        }
        this.inqireCo++;
    }

    public void updateReplyOrder(Long pstSn) {
        this.pstSn = pstSn;
    }

    public void increaseLikeCo() {
        if (this.likeCo == null) {
            this.likeCo = 0;
        }
        this.likeCo++;
    }

    // 카운트 업데이트 비즈니스 메서드
    public void updateCommentCount(int count) {
        this.commentCo = count;
    }

    public void updateFileCount(int count) {
        this.fileCo = count;
    }
}
