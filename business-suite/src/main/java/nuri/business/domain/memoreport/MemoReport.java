package nuri.business.domain.memoreport;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_memo_rpt_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class MemoReport extends BaseEntity {

    @Id
    @Column(name = "rpt_id", length = 20)
    private String reportId;

    @Column(name = "rpt_ttl", length = 255, nullable = false)
    private String reportSubject;

    @Column(name = "memo_rpt_ymd", length = 10)
    private String reprtDe;

    @Column(name = "user_id", length = 20, nullable = false)
    private String writerId;

    @Column(name = "rptr_id", length = 20, nullable = false)
    private String reportrId;

    @Column(name = "rpt_cn", columnDefinition = "TEXT")
    private String reportContents;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "drctn_mttr", length = 2000)
    private String instrCn;

    @Column(name = "drctn_mttr_reg_dt", length = 20)
    private String instrRegDt;

    @Column(name = "rptr_inq_dt", length = 20)
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
