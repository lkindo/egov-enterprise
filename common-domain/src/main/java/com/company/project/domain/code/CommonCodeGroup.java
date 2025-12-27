package com.company.project.domain.code;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 공통 코드 그룹 엔티티 (CCMMNCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "CCMMNCODE")
public class CommonCodeGroup {

    @Id
    @Column(name = "CODE_ID", length = 18)
    private String codeId;

    @Column(name = "CODE_ID_NM", length = 180)
    private String codeIdNm;

    @Column(name = "CODE_ID_DC", length = 600)
    private String codeIdDc;

    @Column(name = "CL_CODE", length = 3)
    private String clCode;

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
    public CommonCodeGroup(String codeId, String codeIdNm, String codeIdDc, String clCode, String useAt,
            String frstRegisterId) {
        this.codeId = codeId;
        this.codeIdNm = codeIdNm;
        this.codeIdDc = codeIdDc;
        this.clCode = clCode;
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void update(String codeIdNm, String codeIdDc, String useAt, String lastUpdusrId) {
        this.codeIdNm = codeIdNm;
        this.codeIdDc = codeIdDc;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void delete() {
        this.useAt = "N";
        this.lastModifiedDate = LocalDateTime.now();
    }
}
