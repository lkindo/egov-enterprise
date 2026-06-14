package nuri.business.domain.system.service.consult;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import nuri.business.domain.common.BaseEntity;
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
    @Column(length = 20)
    private String dscsnId;

    @Column(length = 100)
    private String dscsnTtl;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String dscsnCn;

    @Column(length = 1)
    private String rlsYn;

    @Column(length = 200)
    private String wrtPswd;

    @Column(length = 4)
    private String areaNo;

    @Column(length = 4)
    private String mdTelno;

    @Column(length = 4)
    private String endTelno;

    @Column(length = 4)
    private String mblFrstTelno;

    @Column(length = 4)
    private String mblMdTelno;

    @Column(length = 4)
    private String mblEndTelno;

    @Column(length = 100)
    private String emlAddr;

    @Column(length = 1)
    private String emlAnsYn;

    @Column(length = 100)
    private String wrterNm;

    @Column(length = 20)
    private String wrtYmd;

    @Column
    @Builder.Default
    private Integer inqCnt = 0;

    @Column(length = 12)
    @Builder.Default
    private String qnaProcSttsCd = "1";

    @Column(length = 20)
    private String atchFileId;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String procCn;

    @Column(length = 20)
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
