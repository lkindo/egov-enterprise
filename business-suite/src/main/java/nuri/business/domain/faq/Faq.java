package nuri.business.domain.faq;

import nuri.foundation.domain.common.BaseEntity;
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
@Table(name = "TB_FAQ_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Faq extends BaseEntity {

    @Id
    @Column(name = "FAQ_ID", length = 20)
    private String faqId;

    @Column(name = "QESTN_SJ", length = 255, nullable = false)
    private String qestnTtl;

    @Column(name = "QESTN_CN", columnDefinition = "TEXT")
    private String qestnCn;

    @Column(name = "ANSWER_CN", columnDefinition = "TEXT")
    private String answerCn;

    @Column(name = "RDCNT")
    @Builder.Default
    private Integer inqireCo = 0;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    public void update(String qestnTtl, String qestnCn, String answerCn, String atchFileId) {
        this.qestnTtl = qestnTtl;
        this.qestnCn = qestnCn;
        this.answerCn = answerCn;
        this.atchFileId = atchFileId;
    }

    public void increaseInqireCo() {
        this.inqireCo = (this.inqireCo == null ? 0 : this.inqireCo) + 1;
    }

    public void increaseViewCount() {
        this.increaseInqireCo();
    }

    // legacy
    public String getQestnSj() { return qestnTtl; }
    public void setQestnSj(String v) { this.qestnTtl = v; }
}
