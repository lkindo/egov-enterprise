package com.company.project.domain.board;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NBBS")
@EntityListeners(AuditingEntityListener.class)
public class Board implements Serializable {

    @EmbeddedId
    private BoardId id;

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

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false, nullable = true)
    private LocalDateTime createdDate = LocalDateTime.now();

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM", nullable = true)
    private LocalDateTime modifiedDate = LocalDateTime.now();

    // Helper methods for easy access
    public String getBbsId() {
        return id != null ? id.getBbsId() : null;
    }

    public Long getNttId() {
        return id != null ? id.getNttId() : null;
    }

    @Builder
    public Board(Long nttId, String bbsId, Long nttNo, String nttSj, String nttCn, String replyAt,
            Long parnts, Integer replyLc, Long sortOrdr, Integer inqireCo, String useAt,
            String ntceBgnde, String ntceEndde, String ntcrId, String ntcrNm, String password,
            String atchFileId, String frstRegisterId) {
        this.id = new BoardId(nttId, bbsId);
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
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String nttSj, String nttCn, String ntcrId, String ntcrNm, String password, String ntceBgnde,
            String ntceEndde, String atchFileId, String lastUpdusrId) {
        this.nttSj = nttSj;
        this.nttCn = nttCn;
        this.ntcrId = ntcrId;
        this.ntcrNm = ntcrNm;
        this.password = password;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void delete(String lastUpdusrId) {
        this.useAt = "N";
        this.lastUpdusrId = lastUpdusrId;
    }

    public void increaseInqireCo() {
        this.inqireCo++;
    }

    public void updateReplyOrder(Long nttNo) {
        this.nttNo = nttNo;
    }
}
