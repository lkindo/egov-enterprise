package com.company.project.domain.code;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * ?⑤벏???브쑬履??꾨뗀諭??酉???(CCMMNCLCODE ???뵠??筌띲끋釉?
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "CCMMNCLCODE")
public class CommonCodeCategory {

    @Id
    @Column(name = "CL_CODE", length = 3)
    private String clCode;

    @Column(name = "CL_CODE_NM", length = 180)
    private String clCodeNm;

    @Column(name = "CL_CODE_DC", length = 600)
    private String clCodeDc;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public CommonCodeCategory(String clCode, String clCodeNm, String clCodeDc, String useAt, String frstRegisterId) {
        this.clCode = clCode;
        this.clCodeNm = clCodeNm;
        this.clCodeDc = clCodeDc;
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void update(String clCodeNm, String clCodeDc, String useAt, String lastUpdusrId) {
        this.clCodeNm = clCodeNm;
        this.clCodeDc = clCodeDc;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void delete() {
        this.useAt = "N";
        this.lastModifiedDate = LocalDateTime.now();
    }
}
