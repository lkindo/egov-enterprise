package nuri.business.domain.memoreport;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
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
    private String rptId;

    @Column(length = 100, nullable = false)
    private String rptTtl;

    @Column(length = 8)
    private String memoRptYmd;

    @Column(length = 20, nullable = false)
    private String userId;

    @Column(length = 20, nullable = false)
    private String rptrId;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String rptCn;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @Column(length = 2000)
    private String drctnMttr;

    @Column(length = 20)
    private String drctnMttrRegDt;

    @Column(length = 20)
    private String rptrInqDt;

    public void update(String rptTtl, String memoRptYmd, String userId, String rptrId,
                      String rptCn, String atchFileId) {
        validateDateFormat(memoRptYmd);
        this.rptTtl = rptTtl;
        this.memoRptYmd = memoRptYmd;
        this.userId = userId;
        this.rptrId = rptrId;
        this.rptCn = rptCn;
        this.atchFileId = atchFileId;
    }

    public void updateInqireDt(String rptrInqDt) {
        validateDateTimeFormat(rptrInqDt);
        this.rptrInqDt = rptrInqDt;
    }

    public void updateDrctMatter(String drctnMttr, String drctnMttrRegDt) {
        validateDateTimeFormat(drctnMttrRegDt);
        this.drctnMttr = drctnMttr;
        this.drctnMttrRegDt = drctnMttrRegDt;
    }

    // ----- [Legacy Getter Aliases for Backwards Compatibility] -----
    public String getReportId() { return this.rptId; }
    public String getReportSubject() { return this.rptTtl; }
    public String getReprtDe() { return this.memoRptYmd; }
    public String getWriterId() { return this.userId; }
    public String getReportrId() { return this.rptrId; }
    public String getReportContents() { return this.rptCn; }
    public String getInstrCn() { return this.drctnMttr; }
    public String getInstrRegDt() { return this.drctnMttrRegDt; }
    public String getReportrInqireDt() { return this.rptrInqDt; }

    // standard aliases
    public String getReprtId() { return this.rptId; }
    public String getReprtTtl() { return this.rptTtl; }
    public String getReprtCn() { return this.rptCn; }
    
    // legacy aliases
    public String getRptId() { return this.rptId; }
    public String getRptTtl() { return this.rptTtl; }
    public String getRptYmd() { return this.memoRptYmd; }
    public String getRptCn() { return this.rptCn; }
    public String getRptUserId() { return this.rptrId; }

    // ----- [Legacy Setter Aliases for Backwards Compatibility] -----
    public void setReportId(String reportId) { this.rptId = reportId; }
    public void setReportSubject(String reportSubject) { this.rptTtl = reportSubject; }
    public void setReprtDe(String reprtDe) { this.memoRptYmd = reprtDe; }
    public void setWriterId(String writerId) { this.userId = writerId; }
    public void setReportrId(String reportrId) { this.rptrId = reportrId; }
    public void setReportContents(String reportContents) { this.rptCn = reportContents; }
    public void setInstrCn(String instrCn) { this.drctnMttr = instrCn; }
    public void setInstrRegDt(String instrRegDt) { this.drctnMttrRegDt = instrRegDt; }
    public void setReportrInqireDt(String reportrInqireDt) { this.rptrInqDt = reportrInqireDt; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----
    public static abstract class MemoReportBuilder<C extends MemoReport, B extends MemoReportBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B reportId(String reportId) {
            this.rptId = reportId;
            return self();
        }
        public B reportSubject(String reportSubject) {
            this.rptTtl = reportSubject;
            return self();
        }
        public B reprtDe(String reprtDe) {
            this.memoRptYmd = reprtDe;
            return self();
        }
        public B writerId(String writerId) {
            this.userId = writerId;
            return self();
        }
        public B reportrId(String reportrId) {
            this.rptrId = reportrId;
            return self();
        }
        public B reportContents(String reportContents) {
            this.rptCn = reportContents;
            return self();
        }
        public B instrCn(String instrCn) {
            this.drctnMttr = instrCn;
            return self();
        }
        public B instrRegDt(String instrRegDt) {
            this.drctnMttrRegDt = instrRegDt;
            return self();
        }
        public B reportrInqireDt(String reportrInqireDt) {
            this.rptrInqDt = reportrInqireDt;
            return self();
        }
    }

    private void validateDateFormat(String ymd) {
        if (ymd == null || ymd.isEmpty()) {
            return;
        }
        String cleanYmd = ymd.replace("-", "");
        if (cleanYmd.length() != 8) {
            throw new nuri.foundation.core.exception.BusinessException(
                "날짜 형식은 8자리 YYYYMMDD 또는 YYYY-MM-DD 여야 합니다.", nuri.foundation.core.exception.ErrorCode.INVALID_INPUT_VALUE);
        }
        try {
            java.time.format.DateTimeFormatter.BASIC_ISO_DATE.parse(cleanYmd);
        } catch (Exception e) {
            throw new nuri.foundation.core.exception.BusinessException(
                "유효하지 않은 날짜 형식입니다: " + ymd, nuri.foundation.core.exception.ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private void validateDateTimeFormat(String dt) {
        if (dt == null || dt.isEmpty()) {
            return;
        }
        try {
            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").parse(dt);
            return;
        } catch (Exception ignored) {}

        try {
            java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss").parse(dt);
            return;
        } catch (Exception e) {
            throw new nuri.foundation.core.exception.BusinessException(
                "유효하지 않은 일시 형식입니다 (yyyy-MM-dd HH:mm:ss 또는 yyyyMMddHHmmss): " + dt, 
                nuri.foundation.core.exception.ErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
