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
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class MemoReport extends BaseEntity {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String rptId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String rptTtl;

    @Column(name = "MEMO_RPT_YMD", length = 10)
    private String rptYmd;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "REPORTR_ID", length = 20, nullable = false)
    private String rptUserId;

    @Column(name = "REPORT_CN", columnDefinition = "TEXT")
    private String rptCn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "DRCT_MATTER", length = 2000)
    private String instrCn;

    @Column(name = "DRCT_MATTER_REGIST_DT", length = 20)
    private String instrRegDt;

    @Column(name = "REPORTR_INQIRE_DT", length = 20)
    private String rptInqDt;

    public void update(String rptTtl, String rptYmd, String writerId, String rptUserId,
                      String rptCn, String atchFileId) {
        this.rptTtl = rptTtl;
        this.rptYmd = rptYmd;
        this.writerId = writerId;
        this.rptUserId = rptUserId;
        this.rptCn = rptCn;
        this.atchFileId = atchFileId;
    }

    public void updateInqireDt(String rptInqDt) {
        this.rptInqDt = rptInqDt;
    }

    public void updateDrctMatter(String instrCn, String instrRegDt) {
        this.instrCn = instrCn;
        this.instrRegDt = instrRegDt;
    }
}
