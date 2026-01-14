package com.company.project.domain.faq;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * FAQ JPA Entity
 * 레거시 테이블: COMTNFAQ
 */
@Entity
@Table(name = "NFAQINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Faq {

    @Id
    @Column(name = "FAQ_ID", length = 20)
    private String faqId;

    @Column(name = "QESTN_SJ", length = 255, nullable = false)
    private String qestnSj;

    @Column(name = "QESTN_CN", length = 4000)
    private String qestnCn;

    @Column(name = "ANSWER_CN", length = 4000)
    private String answerCn;

    @Column(name = "RDCNT")
    private Integer inqireCo = 0;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Faq(String faqId, String qestnSj, String qestnCn, String answerCn,
            String atchFileId, String frstRegisterId) {
        this.faqId = faqId;
        this.qestnSj = qestnSj;
        this.qestnCn = qestnCn;
        this.answerCn = answerCn;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.inqireCo = 0;
    }

    /**
     * FAQ 수정
     */
    public void update(String qestnSj, String qestnCn, String answerCn,
            String atchFileId, String updusrId) {
        this.qestnSj = qestnSj;
        this.qestnCn = qestnCn;
        this.answerCn = answerCn;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    /**
     * 조회수 증가
     */
    public void increaseViewCount() {
        this.inqireCo = (this.inqireCo == null ? 0 : this.inqireCo) + 1;
    }
}
