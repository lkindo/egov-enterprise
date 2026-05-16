package nuri.business.domain.memoreport;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_MEMO_RPT_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class MemoReport extends BaseEntity {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String reprtId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String reprtTtl;

    @Column(name = "MEMO_RPT_YMD", length = 10)
    private String reprtDe;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "REPORTR_ID", length = 20, nullable = false)
    private String reportrId;

    @Column(name = "REPORT_CN", columnDefinition = "TEXT")
    private String reprtCn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "DRCT_MATTER", length = 2000)
    private String instrCn;

    @Column(name = "DRCT_MATTER_REGIST_DT", length = 20)
    private String instrRegDt;

    @Column(name = "REPORTR_INQIRE_DT", length = 20)
    private String reportrInqireDt;

    public void update(String reprtTtl, String reprtDe, String writerId, String reportrId,
                      String reprtCn, String atchFileId) {
        this.reprtTtl = reprtTtl;
        this.reprtDe = reprtDe;
        this.writerId = writerId;
        this.reportrId = reportrId;
        this.reprtCn = reprtCn;
        this.atchFileId = atchFileId;
    }

    public void updateInqireDt(String reportrInqireDt) {
        this.reportrInqireDt = reportrInqireDt;
    }

    public void updateDrctMatter(String instrCn, String instrRegDt) {
        this.instrCn = instrCn;
        this.instrRegDt = instrRegDt;
    }

    // legacy
    public String getRptId() { return reprtId; }
    public String getRptTtl() { return reprtTtl; }
    public String getRptYmd() { return reprtDe; }
    public String getRptCn() { return reprtCn; }
    public String getRptUserId() { return reportrId; }
}
