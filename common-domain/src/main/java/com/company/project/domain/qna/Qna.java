package com.company.project.domain.qna;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Q&A JPA Entity
 * 레거시 테이블: COMTNQNA
 */
@Entity
@Table(name = "COMTNQNA")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Qna {

    @Id
    @Column(name = "QA_ID", length = 20)
    private String qaId;

    @Column(name = "QESTN_SJ", length = 255, nullable = false)
    private String qestnSj;

    @Column(name = "QESTN_CN", length = 4000)
    private String qestnCn;

    @Column(name = "WRITNG_PASSWORD", length = 100)
    private String writngPassword;

    @Column(name = "WRTER_NM", length = 50)
    private String wrterNm;

    @Column(name = "EMAIL_ADRES", length = 100)
    private String emailAdres;

    @Column(name = "EMAIL_ANSWER_AT", length = 1)
    private String emailAnswerAt;

    @Column(name = "AREA_NO", length = 10)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 10)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 10)
    private String endTelno;

    @Column(name = "QNA_PROCESS_STTUS_CODE", length = 20)
    private String qnaProcessSttusCode;

    @Column(name = "ANSWER_CN", length = 4000)
    private String answerCn;

    @Column(name = "ANSWER_DE", length = 20)
    private String answerDe;

    @Column(name = "INQIRE_CO")
    private Integer inqireCo = 0;

    @Column(name = "WRITNG_DE", length = 20)
    private String writngDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Qna(String qaId, String qestnSj, String qestnCn, String writngPassword,
            String wrterNm, String emailAdres, String emailAnswerAt,
            String areaNo, String middleTelno, String endTelno,
            String frstRegisterId) {
        this.qaId = qaId;
        this.qestnSj = qestnSj;
        this.qestnCn = qestnCn;
        this.writngPassword = writngPassword;
        this.wrterNm = wrterNm;
        this.emailAdres = emailAdres;
        this.emailAnswerAt = emailAnswerAt;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.qnaProcessSttusCode = "Q"; // 질문상태
        this.inqireCo = 0;
        this.writngDe = java.time.LocalDate.now().toString().replace("-", "");
    }

    /**
     * Q&A 수정 (질문자)
     */
    public void updateQuestion(String qestnSj, String qestnCn, String emailAdres,
            String areaNo, String middleTelno, String endTelno, String updusrId) {
        this.qestnSj = qestnSj;
        this.qestnCn = qestnCn;
        this.emailAdres = emailAdres;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    /**
     * Q&A 답변 등록
     */
    public void updateAnswer(String answerCn, String updusrId) {
        this.answerCn = answerCn;
        this.answerDe = java.time.LocalDate.now().toString().replace("-", "");
        this.qnaProcessSttusCode = "A"; // 답변완료
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    /**
     * 조회수 증가
     */
    public void increaseViewCount() {
        this.inqireCo = (this.inqireCo == null ? 0 : this.inqireCo) + 1;
    }

    /**
     * 비밀번호 확인
     */
    public boolean checkPassword(String password) {
        if (this.writngPassword == null)
            return true;
        return this.writngPassword.equals(password);
    }
}
