package nuri.foundation.domain.system.service.consult;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "tb_dscsn_list")
@SuperBuilder
public class CnsltManage extends BaseEntity {

    @Id
    @Column(name = "dscsn_id", length = 20)
    private String cnsltId;

    @Column(name = "dscsn_ttl", length = 100)
    private String cnsltSj;

    @Column(name = "dscsn_cn", columnDefinition = "TEXT", length = 4000)
    private String cnsltCn;

    @Column(name = "rls_yn", length = 1)
    private String othbcAt;

    @Column(name = "wrt_pswd", length = 200)
    private String writngPassword;

    @Column(name = "area_no", length = 4)
    private String areaNo;

    @Column(name = "md_telno", length = 4)
    private String middleTelno;

    @Column(name = "end_telno", length = 4)
    private String endTelno;

    @Column(name = "mbl_frst_telno", length = 4)
    private String firstMoblphonNo;

    @Column(name = "mbl_md_telno", length = 4)
    private String middleMbtlnum;

    @Column(name = "mbl_end_telno", length = 4)
    private String endMbtlnum;

    @Column(name = "eml_addr", length = 100)
    private String emailAdres;

    @Column(name = "eml_ans_yn", length = 1)
    private String emailAnswerAt;

    @Column(name = "wrter_nm", length = 100)
    private String wrterNm;

    @Column(name = "wrt_ymd", length = 20)
    private String writngDe;

    @Column(name = "inq_cnt")
    @Builder.Default
    private Integer inqireCo = 0;

    @Column(name = "qna_proc_stts_cd", length = 3)
    @Builder.Default
    private String qnaProcessSttusCode = "1";

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "proc_cn", columnDefinition = "TEXT", length = 4000)
    private String managtCn;

    @Column(name = "mng_ymd", length = 20)
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
