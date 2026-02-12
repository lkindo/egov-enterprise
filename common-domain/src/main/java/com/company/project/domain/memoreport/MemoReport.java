package com.company.project.domain.memoreport;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 메모보고 엔티티
 * 레거시 테이블: NMEMOREPRT
 */
@Entity
@Table(name = "NMEMOREPRT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemoReport extends BaseEntity {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String reprtId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String reprtSj;

    @Column(name = "REPORT_DE", length = 10)
    private String reportDe;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String wrterId;

    @Column(name = "REPORTR_ID", length = 20, nullable = false)
    private String reportrId;

    @Column(name = "REPORT_CN", columnDefinition = "TEXT")
    private String reportCn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "DRCT_MATTER", length = 2000)
    private String drctMatter;

    @Column(name = "DRCT_MATTER_REGIST_DT", length = 20)
    private String drctMatterRegistDt;

    @Column(name = "REPORTR_INQIRE_DT", length = 20)
    private String reportrInqireDt;

    @Builder
    public MemoReport(String reprtId, String reprtSj, String reportDe, String wrterId,
                      String reportrId, String reportCn, String atchFileId,
                      String drctMatter, String drctMatterRegistDt, String reportrInqireDt) {
        this.reprtId = reprtId;
        this.reprtSj = reprtSj;
        this.reportDe = reportDe;
        this.wrterId = wrterId;
        this.reportrId = reportrId;
        this.reportCn = reportCn;
        this.atchFileId = atchFileId;
        this.drctMatter = drctMatter;
        this.drctMatterRegistDt = drctMatterRegistDt;
        this.reportrInqireDt = reportrInqireDt;
    }

    public void update(String reprtSj, String reportDe, String wrterId, String reportrId,
                      String reportCn, String atchFileId) {
        this.reprtSj = reprtSj;
        this.reportDe = reportDe;
        this.wrterId = wrterId;
        this.reportrId = reportrId;
        this.reportCn = reportCn;
        this.atchFileId = atchFileId;
    }

    public void updateDrctMatter(String drctMatter, String drctMatterRegistDt) {
        this.drctMatter = drctMatter;
        this.drctMatterRegistDt = drctMatterRegistDt;
    }

    public void updateInqireDt(String reportrInqireDt) {
        this.reportrInqireDt = reportrInqireDt;
    }
}
