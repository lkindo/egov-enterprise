package com.company.project.domain.code;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 공통 상세 코드 엔티티 (CCMMNDETAILCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@IdClass(CommonCodeId.class)
@Table(name = "CCMMNDETAILCODE")
public class CommonCode {

    @Id
    @Column(name = "CODE_ID", length = 18)
    private String codeGroupId; // eGovFrame 표준의 CODE_ID

    @Id
    @Column(name = "CODE", length = 45)
    private String code; // 상세 코드

    @Column(name = "CODE_NM", length = 180)
    private String codeNm; // 코드명

    @Column(name = "CODE_DC", length = 600)
    private String codeDc; // 코드 설명

    @Column(name = "USE_AT", length = 1)
    private String useAt; // 사용 여부 (Y/N)

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public CommonCode(String codeGroupId, String code, String codeNm, String codeDc, String useAt,
            String frstRegisterId) {
        this.codeGroupId = codeGroupId;
        this.code = code;
        this.codeNm = codeNm;
        this.codeDc = codeDc;
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void update(String codeNm, String codeDc, String useAt, String lastUpdusrId) {
        this.codeNm = codeNm;
        this.codeDc = codeDc;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void delete() {
        this.useAt = "N";
        this.lastModifiedDate = LocalDateTime.now();
    }
}
