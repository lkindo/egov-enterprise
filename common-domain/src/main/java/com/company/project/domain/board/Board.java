package com.company.project.domain.board;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NBBS")
@EntityListeners(AuditingEntityListener.class)
@SQLRestriction("use_at = 'Y'")
public class Board implements Serializable {
    private static final long serialVersionUID = 1L;

    @jakarta.persistence.Id
    @jakarta.persistence.GeneratedValue(strategy = jakarta.persistence.GenerationType.SEQUENCE, generator = "nttIdSeq")
    @jakarta.persistence.SequenceGenerator(name = "nttIdSeq", sequenceName = "NTT_ID_SEQ", allocationSize = 1)
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
    private Integer inqireCo;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

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

    @CreatedBy
    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @LastModifiedBy
    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime modifiedDate;

    @Column(name = "SECRET_AT", length = 1)
    private String secretAt;

    @Column(name = "NOTICE_AT", length = 1)
    private String noticeAt;

    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Builder
    public Board(Long nttId, String bbsId, Long nttNo, String nttSj, String nttCn, String replyAt,
            Long parnts, Integer replyLc, Long sortOrdr, Integer inqireCo, String useAt,
            String ntceBgnde, String ntceEndde, String ntcrId, String ntcrNm, String password,
            String atchFileId) {
        this.nttId = nttId;
        this.bbsId = Objects.requireNonNull(bbsId);
        this.nttNo = nttNo;
        this.nttSj = nttSj;
        this.nttCn = nttCn;
        this.replyAt = replyAt;
        this.parnts = parnts;
        this.replyLc = replyLc;
        this.sortOrdr = sortOrdr;
        this.inqireCo = inqireCo == null ? 0 : inqireCo;
        this.useAt = useAt == null ? "Y" : useAt;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.ntcrId = ntcrId;
        this.ntcrNm = ntcrNm;
        this.password = password;
        this.atchFileId = atchFileId;
    }

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
}