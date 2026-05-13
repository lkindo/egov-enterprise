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
@SQLRestriction("use_at = 'Y'")
@SuperBuilder
public class Board extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "nttIdSeq")
    @SequenceGenerator(name = "nttIdSeq", sequenceName = "NTT_ID_SEQ", allocationSize = 1)
    @Column(name = "PST_ID")
    private Long nttId;

    @Column(name = "BBS_ID", nullable = false)
    private String bbsId;

    @Column(name = "REPLY_SN")
    private Long nttNo;

    @Column(name = "NTT_SJ", length = 2000)
    private String nttSj;

    @Column(name = "NTT_CN")
    private String nttCn;

    @Column(name = "ANSWER_AT", length = 1)
    private String replyAt;

    @Column(name = "UP_PST_ID")
    private Long parnts;

    @Column(name = "ANSWER_LC")
    private Integer replyLc;

    @Column(name = "SORT_ORDR")
    private Long sortOrdr;

    @Column(name = "SJ_BOLD_AT", length = 1)
    private String sjBoldAt;

    @Column(name = "RDCNT")
    @Builder.Default
    private Integer inqireCo = 0;

    @Column(name = "USE_AT", length = 1)
    @Builder.Default
    private String useAt = "Y";

    @Column(name = "NTCE_BGNDE", length = 20)
    private String ntceBgnde;

    @Column(name = "NTCE_ENDDE", length = 20)
    private String ntceEndde;

    @Column(name = "NTCR_ID", length = 20)
    private String ntcrId;

    @Column(name = "NTCR_NM", length = 20)
    private String ntcrNm;

    @Column(name = "PASSWORD", length = 200)
    private String password;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "SECRET_AT", length = 1)
    private String secretAt;

    @Column(name = "NOTICE_AT", length = 1)
    private String noticeAt;

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

    public void update(String nttSj, String nttCn, String ntcrId, String ntcrNm, String password, String ntceBgnde,
            String ntceEndde, String atchFileId, java.time.LocalDateTime eventDate, String qnaStatus, String qnaCategory, String secretAt) {
        this.nttSj = nttSj;
        this.nttCn = nttCn;
        this.ntcrId = ntcrId;
        this.ntcrNm = ntcrNm;
        this.password = password;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.atchFileId = atchFileId;
        this.eventDate = eventDate;
        this.qnaStatus = qnaStatus;
        this.qnaCategory = qnaCategory;
        this.secretAt = secretAt;
    }

    public void delete() {
        this.useAt = "N";
    }

    public void increaseInqireCo() {
        if (this.inqireCo == null) {
            this.inqireCo = 0;
        }
        this.inqireCo++;
    }

    public void updateReplyOrder(Long nttNo) {
        this.nttNo = nttNo;
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
