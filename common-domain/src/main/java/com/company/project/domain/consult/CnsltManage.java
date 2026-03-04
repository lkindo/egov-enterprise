package com.company.project.domain.consult;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NCNSLTLIST")
public class CnsltManage {

    @Id
    @Column(name = "CNSLT_ID", length = 20)
    private String cnsltId;

    @Column(name = "CNSLT_SJ", length = 255)
    private String cnsltSj;

    @Column(name = "CNSLT_CN", columnDefinition = "TEXT")
    private String cnsltCn;

    @Column(name = "OTHBC_AT", length = 1)
    private String othbcAt;

    @Column(name = "WRITNG_PASSWORD", length = 20)
    private String writngPassword;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "FRST_MBTLNUM", length = 4)
    private String firstMoblphonNo;

    @Column(name = "MIDDLE_MBTLNUM", length = 4)
    private String middleMbtlnum;

    @Column(name = "END_MBTLNUM", length = 4)
    private String endMbtlnum;

    @Column(name = "EMAIL_ADRES", length = 50)
    private String emailAdres;

    @Column(name = "EMAIL_ANSWER_AT", length = 1)
    private String emailAnswerAt;

    @Column(name = "WRTER_NM", length = 20)
    private String wrterNm;

    @Column(name = "WRITNG_DE", length = 20)
    private String writngDe; // Using String to match legacy text format if needed, or LocalDateTime if
                             // converted. Legacy XML uses TO_CHAR(NOW(), ...). Let's use String for
                             // compatibility or LocalDateTime if we can. The XML maps it to details. Let's
                             // keep String or LocalDateTime. The XML inserts TO_CHAR(NOW(), 'YYYY-mm-dd
                             // HH24:MI:SS'). Let's use String.

    @Column(name = "RDCNT")
    private Integer inqireCo;

    @Column(name = "QNA_PROCESS_STTUS_CODE", length = 3)
    private String qnaProcessSttusCode;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "MANAGT_CN", columnDefinition = "TEXT")
    private String managtCn;

    @Column(name = "MANAGT_DE", length = 20)
    private String managtDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public CnsltManage(String cnsltId, String cnsltSj, String cnsltCn, String othbcAt, String writngPassword,
            String areaNo, String middleTelno, String endTelno, String firstMoblphonNo, String middleMbtlnum,
            String endMbtlnum,
            String emailAdres, String emailAnswerAt, String wrterNm, String atchFileId, String frstRegisterId) {
        this.cnsltId = cnsltId;
        this.cnsltSj = cnsltSj;
        this.cnsltCn = cnsltCn;
        this.othbcAt = othbcAt;
        this.writngPassword = writngPassword;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.firstMoblphonNo = firstMoblphonNo;
        this.middleMbtlnum = middleMbtlnum;
        this.endMbtlnum = endMbtlnum;
        this.emailAdres = emailAdres;
        this.emailAnswerAt = emailAnswerAt;
        this.wrterNm = wrterNm;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.inqireCo = 0;
        this.qnaProcessSttusCode = "1"; // Default status
    }

    public void update(String cnsltSj, String cnsltCn, String othbcAt, String writngPassword,
            String areaNo, String middleTelno, String endTelno, String firstMoblphonNo, String middleMbtlnum,
            String endMbtlnum,
            String emailAdres, String emailAnswerAt, String wrterNm, String atchFileId, String lastUpdusrId) {
        this.cnsltSj = cnsltSj;
        this.cnsltCn = cnsltCn;
        this.othbcAt = othbcAt;
        this.writngPassword = writngPassword;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.firstMoblphonNo = firstMoblphonNo;
        this.middleMbtlnum = middleMbtlnum;
        this.endMbtlnum = endMbtlnum;
        this.emailAdres = emailAdres;
        this.emailAnswerAt = emailAnswerAt;
        this.wrterNm = wrterNm;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    public void incrementInqireCo() {
        this.inqireCo = (this.inqireCo == null ? 0 : this.inqireCo) + 1;
    }

    public void updateAnswer(String qnaProcessSttusCode, String managtCn, String lastUpdusrId) {
        this.qnaProcessSttusCode = qnaProcessSttusCode;
        this.managtCn = managtCn;
        this.managtDe = LocalDateTime.now().toString(); // Simplification
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
