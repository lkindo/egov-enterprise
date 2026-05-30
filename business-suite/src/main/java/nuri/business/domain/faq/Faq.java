package nuri.business.domain.faq;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * FAQ 정보 Entity
 * 매핑 테이블: TB_FAQ_INFO
 */
@Entity
@Table(name = "tb_faq_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Faq extends BaseEntity {

    @Id
    @Column(name = "faq_id", length = 20)
    private String faqId;

    @Column(length = 100, nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("qestnTtl")
    private String qstnTtl;

    @Column(columnDefinition = "TEXT", length = 4000)
    @com.fasterxml.jackson.annotation.JsonProperty("qestnCn")
    private String qstnCn;

    @Column(columnDefinition = "TEXT", length = 4000)
    @com.fasterxml.jackson.annotation.JsonProperty("answerCn")
    private String ansCn;

    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonProperty("inqireCo")
    private Integer inqCnt = 0;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    public void update(String qestnTtl, String qestnCn, String answerCn, String atchFileId) {
        this.qstnTtl = qestnTtl;
        this.qstnCn = qestnCn;
        this.ansCn = answerCn;
        this.atchFileId = atchFileId;
    }

    public void increaseInqireCo() {
        this.inqCnt = (this.inqCnt == null ? 0 : this.inqCnt) + 1;
    }

    public void increaseViewCount() {
        this.increaseInqireCo();
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getQestnTtl() { return this.qstnTtl; }
    public void setQestnTtl(String v) { this.qstnTtl = v; }

    public String getQestnCn() { return this.qstnCn; }
    public void setQestnCn(String v) { this.qstnCn = v; }

    public String getAnswerCn() { return this.ansCn; }
    public void setAnswerCn(String v) { this.ansCn = v; }

    public Integer getInqireCo() { return this.inqCnt; }
    public void setInqireCo(Integer v) { this.inqCnt = v; }

    public String getQestnSj() { return this.qstnTtl; }
    public void setQestnSj(String v) { this.qstnTtl = v; }

    public static abstract class FaqBuilder<C extends Faq, B extends FaqBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String qstnTtl;
        private String qstnCn;
        private String ansCn;
        private Integer inqCnt;

        public B qestnTtl(String qestnTtl) {
            this.qstnTtl = qestnTtl;
            return self();
        }
        public B qestnCn(String qestnCn) {
            this.qstnCn = qestnCn;
            return self();
        }
        public B answerCn(String answerCn) {
            this.ansCn = answerCn;
            return self();
        }
        public B inqireCo(Integer inqireCo) {
            this.inqCnt = inqireCo;
            return self();
        }
    }
}
