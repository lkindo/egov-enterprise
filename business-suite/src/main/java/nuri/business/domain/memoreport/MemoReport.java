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
    private String reportId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String reportSubject;

    @Column(name = "MEMO_RPT_YMD", length = 10)
    private String reprtDe;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "REPORTR_ID", length = 20, nullable = false)
    private String reportrId;

    @Column(name = "REPORT_CN", columnDefinition = "TEXT")
    private String reportContents;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "DRCT_MATTER", length = 2000)
    private String instrCn;

    @Column(name = "DRCT_MATTER_REGIST_DT", length = 20)
    private String instrRegDt;

    @Column(name = "REPORTR_INQIRE_DT", length = 20)
    private String reportrInqireDt;

    public void update(String reportSubject, String reprtDe, String writerId, String reportrId,
                      String reportContents, String atchFileId) {
        this.reportSubject = reportSubject;
        this.reprtDe = reprtDe;
        this.writerId = writerId;
        this.reportrId = reportrId;
        this.reportContents = reportContents;
        this.atchFileId = atchFileId;
    }

    public void updateInqireDt(String reportrInqireDt) {
        this.reportrInqireDt = reportrInqireDt;
    }

    public void updateDrctMatter(String instrCn, String instrRegDt) {
        this.instrCn = instrCn;
        this.instrRegDt = instrRegDt;
    }

    // standard aliases
    public String getReprtId() { return reportId; }
    public String getReprtTtl() { return reportSubject; }
    public String getReprtCn() { return reportContents; }
    
    // legacy
    public String getRptId() { return reportId; }
    public String getRptTtl() { return reportSubject; }
    public String getRptYmd() { return reprtDe; }
    public String getRptCn() { return reportContents; }
    public String getRptUserId() { return reportrId; }
}
