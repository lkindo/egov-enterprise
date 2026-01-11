package com.company.project.domain.terms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.EntityListeners;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "COMTNCPYRHTPRTCPOLICY")
@EntityListeners(AuditingEntityListener.class)
public class CpyrhtPrtcPolicy {

    @Id
    @Column(name = "CPYRHT_ID", length = 20)
    private String cpyrhtId;

    @Column(name = "CPYRHT_PRTC_POLICY_CN", length = 2500)
    private String cpyrhtPrtcPolicyCn;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public CpyrhtPrtcPolicy(String cpyrhtId, String cpyrhtPrtcPolicyCn, String frstRegisterId) {
        this.cpyrhtId = cpyrhtId;
        this.cpyrhtPrtcPolicyCn = cpyrhtPrtcPolicyCn;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String cpyrhtPrtcPolicyCn, String lastUpdusrId) {
        this.cpyrhtPrtcPolicyCn = cpyrhtPrtcPolicyCn;
        this.lastUpdusrId = lastUpdusrId;
    }
}
