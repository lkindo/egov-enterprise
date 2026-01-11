package com.company.project.domain.notification;

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
@Table(name = "NEVENTINFO")
public class EventCmpgn {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "EVENT_SVC_BGNDE", length = 20)
    private String eventSvcBeginDe;

    @Column(name = "SVC_USE_NMPR_CO")
    private Integer svcUseNmprCo;

    @Column(name = "CHARGER_NM", length = 50)
    private String chargerNm;

    @Column(name = "EVENT_CN", length = 1000)
    private String eventCn;

    @Column(name = "EVENT_SVC_ENDDE", length = 20)
    private String eventSvcEndDe;

    @Column(name = "EVENT_TY_CODE", length = 3)
    private String eventTyCode;

    @Column(name = "PRPARETG_CN", length = 1000)
    private String prparetgCn;

    @Column(name = "EVENT_CONFM_AT", length = 1)
    private String eventConfmAt;

    @Column(name = "EVENT_CONFM_DE", length = 20)
    private String eventConfmDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public EventCmpgn(String eventId, String eventSvcBeginDe, Integer svcUseNmprCo, String chargerNm, String eventCn,
            String eventSvcEndDe, String eventTyCode, String prparetgCn, String eventConfmAt, String eventConfmDe,
            String frstRegisterId) {
        this.eventId = eventId;
        this.eventSvcBeginDe = eventSvcBeginDe;
        this.svcUseNmprCo = svcUseNmprCo;
        this.chargerNm = chargerNm;
        this.eventCn = eventCn;
        this.eventSvcEndDe = eventSvcEndDe;
        this.eventTyCode = eventTyCode;
        this.prparetgCn = prparetgCn;
        this.eventConfmAt = eventConfmAt;
        this.eventConfmDe = eventConfmDe;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String eventSvcBeginDe, Integer svcUseNmprCo, String chargerNm, String eventCn,
            String eventSvcEndDe, String eventTyCode, String prparetgCn, String eventConfmAt, String eventConfmDe,
            String lastUpdusrId) {
        this.eventSvcBeginDe = eventSvcBeginDe;
        this.svcUseNmprCo = svcUseNmprCo;
        this.chargerNm = chargerNm;
        this.eventCn = eventCn;
        this.eventSvcEndDe = eventSvcEndDe;
        this.eventTyCode = eventTyCode;
        this.prparetgCn = prparetgCn;
        this.eventConfmAt = eventConfmAt;
        this.eventConfmDe = eventConfmDe;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
