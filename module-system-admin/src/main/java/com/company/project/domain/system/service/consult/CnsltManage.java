package com.company.project.domain.system.service.consult;

import java.time.LocalDateTime;
import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "NCNSLTLIST")
@SuperBuilder
public class CnsltManage extends BaseEntity {

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
    private String writngDe;

    @Column(name = "RDCNT")
    @Builder.Default
    private Integer inqireCo = 0;

    @Column(name = "QNA_PROCESS_STTUS_CODE", length = 3)
    @Builder.Default
    private String qnaProcessSttusCode = "1";

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "MANAGT_CN", columnDefinition = "TEXT")
    private String managtCn;

    @Column(name = "MANAGT_DE", length = 20)
    private String managtDe;

    public void update(String cnsltSj, String cnsltCn, String othbcAt, String writngPassword,
            String areaNo, String middleTelno, String endTelno, String firstMoblphonNo, String middleMbtlnum,
            String endMbtlnum,
            String emailAdres, String emailAnswerAt, String wrterNm, String atchFileId) {
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
    }

    public void incrementInqireCo() {
        this.inqireCo = (this.inqireCo == null ? 0 : this.inqireCo) + 1;
    }

    public void updateAnswer(String qnaProcessSttusCode, String managtCn) {
        this.qnaProcessSttusCode = qnaProcessSttusCode;
        this.managtCn = managtCn;
        this.managtDe = LocalDateTime.now().toString();
    }
}
