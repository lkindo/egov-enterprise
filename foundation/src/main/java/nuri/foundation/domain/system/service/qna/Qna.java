package nuri.foundation.domain.system.service.qna;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Q&A 엔티티 (NQAINFO 테이블 매핑)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NQAINFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Qna extends BaseEntity {

    @Id
    @Column(name = "QA_ID", length = 20)
    private String qaId;

    @Column(name = "QESTN_SJ", length = 255, nullable = false)
    private String qestnSj;

    @Column(name = "QESTN_CN", length = 2500)
    private String qestnCn;

    @Column(name = "WRITNG_PASSWORD", length = 20)
    private String writngPassword;

    @Column(name = "WRTER_NM", length = 20)
    private String wrterNm;

    @Column(name = "EMAIL_ADRES", length = 50)
    private String emailAdres;

    @Column(name = "EMAIL_ANSWER_AT", length = 1)
    private String emailAnswerAt;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "QNA_PROCESS_STTUS_CODE", length = 1)
    @Builder.Default
    private String qnaProcessSttusCode = "Q";

    @Column(name = "ANSWER_CN", length = 2500)
    private String answerCn;

    @Column(name = "ANSWER_DE", length = 20)
    private String answerDe;

    @Column(name = "RDCNT")
    @Builder.Default
    private Integer inqireCo = 0;

    @Column(name = "WRITNG_DE", length = 20)
    private String writngDe;

    public void updateQuestion(String qestnSj, String qestnCn, String emailAdres, String areaNo, String middleTelno,
            String endTelno) {
        this.qestnSj = qestnSj;
        this.qestnCn = qestnCn;
        this.emailAdres = emailAdres;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
    }

    public void answer(String answerCn) {
        this.answerCn = answerCn;
        this.answerDe = java.time.LocalDate.now().toString().replace("-", "");
        this.qnaProcessSttusCode = "A";
    }

    public void increaseInqireCo() {
        this.inqireCo = (this.inqireCo == null ? 0 : this.inqireCo) + 1;
    }

    public void increaseViewCount() {
        this.increaseInqireCo();
    }
}
