package com.company.project.domain.integration;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "NSYSTEMCNTC")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SystemConnection {

    @Id
    @Column(name = "CNTC_ID", length = 20)
    private String cntcId;

    @Column(name = "CNTC_NM", length = 100, nullable = false)
    private String cntcNm;

    @Column(name = "CNTC_TY", length = 20)
    private String cntcType;

    @Column(name = "PROVD_INSTT_ID", length = 20)
    private String provdInsttId;

    @Column(name = "PROVD_SYS_ID", length = 20)
    private String provdSysId;

    @Column(name = "PROVD_SVC_ID", length = 20)
    private String provdSvcId;

    @Column(name = "REQUST_INSTT_ID", length = 20)
    private String requstInsttId;

    @Column(name = "REQUST_SYS_ID", length = 20)
    private String requstSysId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "VALID_BGNDE", length = 8)
    private String validBeginDe;

    @Column(name = "VALID_ENDDE", length = 8)
    private String validEndDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Builder
    public SystemConnection(String cntcId, String cntcNm, String cntcType, String provdInsttId, String provdSysId,
            String provdSvcId, String requstInsttId, String requstSysId, String confmAt, String useAt,
            String validBeginDe, String validEndDe, String frstRegisterId) {
        this.cntcId = cntcId;
        this.cntcNm = cntcNm;
        this.cntcType = cntcType;
        this.provdInsttId = provdInsttId;
        this.provdSysId = provdSysId;
        this.provdSvcId = provdSvcId;
        this.requstInsttId = requstInsttId;
        this.requstSysId = requstSysId;
        this.confmAt = confmAt != null ? confmAt : "N";
        this.useAt = useAt != null ? useAt : "Y";
        this.validBeginDe = validBeginDe;
        this.validEndDe = validEndDe;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = frstRegisterId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String cntcNm, String cntcType, String provdInsttId, String provdSysId, String provdSvcId,
            String requstInsttId, String requstSysId, String confmAt, String useAt, String validBeginDe,
            String validEndDe, String updusrId) {
        this.cntcNm = cntcNm;
        this.cntcType = cntcType;
        this.provdInsttId = provdInsttId;
        this.provdSysId = provdSysId;
        this.provdSvcId = provdSvcId;
        this.requstInsttId = requstInsttId;
        this.requstSysId = requstSysId;
        this.confmAt = confmAt;
        this.useAt = useAt;
        this.validBeginDe = validBeginDe;
        this.validEndDe = validEndDe;
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void confirm(String confmAt, String updusrId) {
        this.confmAt = confmAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
