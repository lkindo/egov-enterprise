package com.company.project.domain.board;

import com.company.project.domain.common.BaseEntity;
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
@Table(name = "NBBS")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SQLRestriction("use_at = 'Y'")
@SuperBuilder
public class Board extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "nttIdSeq")
    @SequenceGenerator(name = "nttIdSeq", sequenceName = "NTT_ID_SEQ", allocationSize = 1)
    @Column(name = "NTT_ID")
    private Long nttId;

    @Column(name = "BBS_ID", nullable = false)
    private String bbsId;

    @Column(name = "NTT_NO")
    private Long nttNo;

    @Column(name = "NTT_SJ", length = 2000)
    private String nttSj;

    @Column(name = "NTT_CN")
    private String nttCn;

    @Column(name = "ANSWER_AT", length = 1)
    private String replyAt;

    @Column(name = "PARNTSCTT_NO")
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

    // 반정규화 필드 (성능 최적화용)
    @Column(name = "COMMENT_CO")
    @Builder.Default
    private Integer commentCo = 0;

    @Column(name = "FILE_CO")
    @Builder.Default
    private Integer fileCo = 0;

    public void update(String nttSj, String nttCn, String ntcrId, String ntcrNm, String password, String ntceBgnde,
            String ntceEndde, String atchFileId) {
        this.nttSj = nttSj;
        this.nttCn = nttCn;
        this.ntcrId = ntcrId;
        this.ntcrNm = ntcrNm;
        this.password = password;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.atchFileId = atchFileId;
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

    // 카운트 업데이트 비즈니스 메서드
    public void updateCommentCount(int count) {
        this.commentCo = count;
    }

    public void updateFileCount(int count) {
        this.fileCo = count;
    }
}
