package com.company.project.foundation.domain.operation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "NEVENTINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventInfo {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "BSNS_YEAR", length = 4)
    private String bsnsYear;

    @Column(name = "BSNS_CODE", length = 2)
    private String bsnsCode;

    @Column(name = "EVENT_CN", length = 1000)
    private String eventCn;

    @Column(name = "EVENT_SVC_BGNDE", length = 20)
    private String eventSvcBgnde;

    @Column(name = "EVENT_SVC_ENDDE", length = 20)
    private String eventSvcEndde;

    @Column(name = "SVC_USE_NMPR_CO")
    private Long svcUseNmprCo;

    @Column(name = "CHARGER_NM", length = 50)
    private String chargerNm;

    @Column(name = "PRPARETG_CN", length = 2500)
    private String prparetgCn;

    @Column(name = "EVENT_TY_CODE", length = 1)
    private String eventTyCode;

    @Column(name = "EVENT_CONFM_AT", length = 1)
    private String eventConfmAt;

    @Column(name = "EVENT_CONFM_DE", length = 20)
    private String eventConfmDe;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public EventInfo(String eventId, String bsnsYear, String bsnsCode, String eventCn, String eventSvcBgnde,
                     String eventSvcEndde, Long svcUseNmprCo, String chargerNm, String prparetgCn,
                     String eventTyCode, String eventConfmAt, String eventConfmDe,
                     String frstRegisterId, String lastUpdusrId) {
        this.eventId = eventId;
        this.bsnsYear = bsnsYear;
        this.bsnsCode = bsnsCode;
        this.eventCn = eventCn;
        this.eventSvcBgnde = eventSvcBgnde;
        this.eventSvcEndde = eventSvcEndde;
        this.svcUseNmprCo = svcUseNmprCo;
        this.chargerNm = chargerNm;
        this.prparetgCn = prparetgCn;
        this.eventTyCode = eventTyCode;
        this.eventConfmAt = eventConfmAt == null ? "N" : eventConfmAt;
        this.eventConfmDe = eventConfmDe;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
