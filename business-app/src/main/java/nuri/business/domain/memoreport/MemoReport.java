package nuri.business.domain.memoreport;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tb_memo_rpt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemoReport extends BaseEntity {

    @Id
    @Column(length = 20)
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

    private MemoReport(String rptId, String rptTtl, String memoRptYmd, String userId,
                       String rptrId, String rptCn, String atchFileId) {
        this.rptId = rptId;
        this.rptTtl = rptTtl;
        this.memoRptYmd = memoRptYmd;
        this.userId = userId;
        this.rptrId = rptrId;
        this.rptCn = rptCn;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static MemoReport create(String rptId, String rptTtl, String memoRptYmd, String userId,
                                    String rptrId, String rptCn, String atchFileId) {
        return new MemoReport(rptId, rptTtl, memoRptYmd, userId, rptrId, rptCn, atchFileId);
    }

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



    private void validateDateFormat(String ymd) {
        if (ymd == null || ymd.isEmpty()) {
            return;
        }
        String cleanYmd = ymd.replace("-", "");
        if (cleanYmd.length() != 8) {
            throw new nuri.foundation.core.exception.BusinessException(
                "날짜 형식은 8자리 YYYYMMDD 또는 YYYY-MM-DD 여야 합니다.", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
        try {
            java.time.format.DateTimeFormatter.BASIC_ISO_DATE.parse(cleanYmd);
        } catch (Exception e) {
            throw new nuri.foundation.core.exception.BusinessException(
                "유효하지 않은 날짜 형식입니다: " + ymd, nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
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
                nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
