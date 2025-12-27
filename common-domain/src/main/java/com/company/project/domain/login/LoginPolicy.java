package com.company.project.domain.login;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NLOGINPOLICY")
public class LoginPolicy extends BaseTimeEntity {

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "IP_INFO", length = 23)
    private String ipInfo;

    @Column(name = "DPLCT_PERM_AT", length = 1)
    private String dplctPermAt;

    @Column(name = "LMTT_AT", length = 1)
    private String lmttAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public LoginPolicy(String emplyrId, String ipInfo, String dplctPermAt, String lmttAt, String frstRegisterId,
            String lastUpdusrId) {
        this.emplyrId = emplyrId;
        this.ipInfo = ipInfo;
        this.dplctPermAt = dplctPermAt;
        this.lmttAt = lmttAt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void update(String ipInfo, String dplctPermAt, String lmttAt, String lastUpdusrId) {
        this.ipInfo = ipInfo;
        this.dplctPermAt = dplctPermAt;
        this.lmttAt = lmttAt;
        this.lastUpdusrId = lastUpdusrId;
    }
}
