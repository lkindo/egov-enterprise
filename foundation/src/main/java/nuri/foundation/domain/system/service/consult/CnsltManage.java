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
    private String dscsnId;

    @Column(name = "dscsn_ttl", length = 100)
    private String dscsnTtl;

    @Column(name = "dscsn_cn", columnDefinition = "TEXT", length = 4000)
    private String dscsnCn;

    @Column(name = "rls_yn", length = 1)
    private String rlsYn;

    @Column(name = "wrt_pswd", length = 200)
    private String wrtPswd;

    @Column(name = "area_no", length = 4)
    private String areaNo;

    @Column(name = "md_telno", length = 4)
    private String mdTelno;

    @Column(name = "end_telno", length = 4)
    private String endTelno;

    @Column(name = "mbl_frst_telno", length = 4)
    private String mblFrstTelno;

    @Column(name = "mbl_md_telno", length = 4)
    private String mblMdTelno;

    @Column(name = "mbl_end_telno", length = 4)
    private String mblEndTelno;

    @Column(name = "eml_addr", length = 100)
    private String emlAddr;

    @Column(name = "eml_ans_yn", length = 1)
    private String emlAnsYn;

    @Column(name = "wrter_nm", length = 100)
    private String wrterNm;

    @Column(name = "wrt_ymd", length = 20)
    private String wrtYmd;

    @Column(name = "inq_cnt")
    @Builder.Default
    private Integer inqCnt = 0;

    @Column(name = "qna_proc_stts_cd", length = 3)
    @Builder.Default
    private String qnaProcSttsCd = "1";

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "proc_cn", columnDefinition = "TEXT", length = 4000)
    private String procCn;

    @Column(name = "mng_ymd", length = 20)
    private String mngYmd;

    public void update(String dscsnTtl, String dscsnCn, String rlsYn, String wrtPswd,
            String areaNo, String mdTelno, String endTelno, String mblFrstTelno, String mblMdTelno,
            String mblEndTelno,
            String emlAddr, String emlAnsYn, String wrterNm, String atchFileId) {
        this.dscsnTtl = dscsnTtl;
        this.dscsnCn = dscsnCn;
        this.rlsYn = rlsYn;
        this.wrtPswd = wrtPswd;
        this.areaNo = areaNo;
        this.mdTelno = mdTelno;
        this.endTelno = endTelno;
        this.mblFrstTelno = mblFrstTelno;
        this.mblMdTelno = mblMdTelno;
        this.mblEndTelno = mblEndTelno;
        this.emlAddr = emlAddr;
        this.emlAnsYn = emlAnsYn;
        this.wrterNm = wrterNm;
        this.atchFileId = atchFileId;
    }

    public void incrementInqireCo() {
        this.inqCnt = (this.inqCnt == null ? 0 : this.inqCnt) + 1;
    }

    public void updateAnswer(String qnaProcSttsCd, String procCn) {
        this.qnaProcSttsCd = qnaProcSttsCd;
        this.procCn = procCn;
        this.mngYmd = LocalDateTime.now().toString();
    }
}
