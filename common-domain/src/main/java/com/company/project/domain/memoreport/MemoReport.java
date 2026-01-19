package com.company.project.domain.memoreport;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 메모보고 엔티티
 * 
 * @see NMEMOREPRT 테이블 매핑
 */
@Entity
@Table(name = "nmemoreprt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MemoReport {

    @Id
    @Column(name = "reprt_id", length = 20)
    private String reprtId;

    @Column(name = "reprt_sj", length = 200)
    private String reprtSj;

    @Column(name = "report_de", length = 8)
    private String reportDe;

    @Column(name = "wrter_id", length = 20)
    private String wrterId;

    @Column(name = "reportr_id", length = 20)
    private String reportrId;

    @Column(name = "report_cn", length = 4000)
    private String reportCn;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @Column(name = "drct_matter", length = 2000)
    private String drctMatter;

    @Column(name = "drct_matter_regist_dt", length = 20)
    private String drctMatterRegistDt;

    @Column(name = "reportr_inqire_dt", length = 20)
    private String reportrInqireDt;

    @Column(name = "frst_register_id", length = 20)
    private String frstRegisterId;

    @Column(name = "frst_regist_pnttm")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "last_updusr_id", length = 20)
    private String lastUpdusrId;

    @Column(name = "last_updt_pnttm")
    private LocalDateTime lastUpdtPnttm;
}
