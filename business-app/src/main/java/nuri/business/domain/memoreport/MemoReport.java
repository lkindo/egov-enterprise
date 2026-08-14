package nuri.business.domain.memoreport;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_memo_rpt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemoReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long memoRptSn;

    @Column(length = 100, nullable = false)
    private String rptTtl;

    @Column(length = 8)
    private String memoRptYmd;

    @Column(length = 20, nullable = false)
    private String userId;

    @Column(length = 20, nullable = false)
    private String rptrId;

    @Column(length = 4000)
    private String rptCn;
    @Column(name = "atch_file_sn")
    private Long atchFileSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_sn", referencedColumnName = "atch_file_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @Column(length = 2000)
    private String drctnMttr;

    private LocalDateTime drctnMttrRegDt;

    private LocalDateTime rptrInqDt;

    private MemoReport(Long memoRptSn, String rptTtl, String memoRptYmd, String userId,
                       String rptrId, String rptCn, Long atchFileSn) {
        this.memoRptSn = memoRptSn;
        this.rptTtl = rptTtl;
        this.memoRptYmd = memoRptYmd;
        this.userId = userId;
        this.rptrId = rptrId;
        this.rptCn = rptCn;
        this.atchFileSn = atchFileSn;
    }

    @Builder
    public static MemoReport create(Long memoRptSn, String rptTtl, String memoRptYmd, String userId,
                                    String rptrId, String rptCn, Long atchFileSn) {
        return new MemoReport(memoRptSn, rptTtl, memoRptYmd, userId, rptrId, rptCn, atchFileSn);
    }

    public void update(String rptTtl, String memoRptYmd, String userId, String rptrId,
                      String rptCn, Long atchFileSn) {
        validateDateFormat(memoRptYmd);
        this.rptTtl = rptTtl;
        this.memoRptYmd = memoRptYmd;
        this.userId = userId;
        this.rptrId = rptrId;
        this.rptCn = rptCn;
        this.atchFileSn = atchFileSn;
    }

    public void updateInqireDt(LocalDateTime rptrInqDt) {
        this.rptrInqDt = rptrInqDt;
    }

    public void updateDrctMatter(String drctnMttr, LocalDateTime drctnMttrRegDt) {
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
}
