package com.company.project.domain.code;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@IdClass(CommonCodeId.class)
@Table(name = "CCMMNDETAILCODE")
public class CommonCode {

    @Id
    @Column(name = "CODE_ID", length = 18)
    private String codeGroupId; // eGovFrame 표준의 CODE_ID (그룹코드 성격)

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
    private java.time.LocalDateTime createdDate;

    @Builder
    public CommonCode(String codeGroupId, String code, String codeNm, String codeDc, String useAt) {
        this.codeGroupId = codeGroupId;
        this.code = code;
        this.codeNm = codeNm;
        this.codeDc = codeDc;
        this.useAt = useAt == null ? "Y" : useAt;
        this.createdDate = java.time.LocalDateTime.now();
    }

    public void update(String codeNm, String codeDc, String useAt) {
        this.codeNm = codeNm;
        this.codeDc = codeDc;
        this.useAt = useAt;
    }
}
