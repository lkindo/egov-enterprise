package com.company.project.domain.faq;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * FAQ 정보 Entity
 * 레거시 테이블: NFAQINFO
 */
@Entity
@Table(name = "NFAQINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Faq extends BaseEntity {

    @Id
    @Column(name = "FAQ_ID", length = 20)
    private String faqId;

    @Column(name = "QESTN_SJ", length = 255, nullable = false)
    private String qestnSj;

    @Column(name = "QESTN_CN", columnDefinition = "TEXT")
    private String qestnCn;

    @Column(name = "ANSWER_CN", columnDefinition = "TEXT")
    private String answerCn;

    @Column(name = "RDCNT")
    private Integer inqireCo = 0;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Builder
    public Faq(String faqId, String qestnSj, String qestnCn, String answerCn, Integer inqireCo, String atchFileId) {
        this.faqId = faqId;
        this.qestnSj = qestnSj;
        this.qestnCn = qestnCn;
        this.answerCn = answerCn;
        this.inqireCo = inqireCo != null ? inqireCo : 0;
        this.atchFileId = atchFileId;
    }

    public void update(String qestnSj, String qestnCn, String answerCn, String atchFileId) {
        this.qestnSj = qestnSj;
        this.qestnCn = qestnCn;
        this.answerCn = answerCn;
        this.atchFileId = atchFileId;
    }

    public void increaseInqireCo() {
        this.inqireCo = (this.inqireCo == null ? 0 : this.inqireCo) + 1;
    }
}
