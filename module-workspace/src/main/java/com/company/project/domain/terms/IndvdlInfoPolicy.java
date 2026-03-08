package com.company.project.domain.terms;

import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NINDVDLINFOPOLICY")
public class IndvdlInfoPolicy {

    @Id
    @Column(name = "INDVDL_INFO_POLICY_ID", length = 20)
    private String indvdlInfoPolicyId;

    @Column(name = "INDVDL_INFO_POLICY_NM", length = 255)
    private String indvdlInfoPolicyNm;

    @Column(name = "INDVDL_INFO_POLICY_CN", length = 1000)
    private String indvdlInfoPolicyCn;

    @Column(name = "INDVDL_INFO_POLICY_AGRE_AT", length = 1)
    private String indvdlInfoPolicyAgreAt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public IndvdlInfoPolicy(String indvdlInfoPolicyId, String indvdlInfoPolicyNm, String indvdlInfoPolicyCn,
            String indvdlInfoPolicyAgreAt, String frstRegisterId) {
        this.indvdlInfoPolicyId = indvdlInfoPolicyId;
        this.indvdlInfoPolicyNm = indvdlInfoPolicyNm;
        this.indvdlInfoPolicyCn = indvdlInfoPolicyCn;
        this.indvdlInfoPolicyAgreAt = indvdlInfoPolicyAgreAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String indvdlInfoPolicyNm, String indvdlInfoPolicyCn, String indvdlInfoPolicyAgreAt,
            String lastUpdusrId) {
        this.indvdlInfoPolicyNm = indvdlInfoPolicyNm;
        this.indvdlInfoPolicyCn = indvdlInfoPolicyCn;
        this.indvdlInfoPolicyAgreAt = indvdlInfoPolicyAgreAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
