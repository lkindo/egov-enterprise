package com.company.project.domain.system;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NEVENTCMPGN")
public class EventCmpgn extends BaseEntity {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "BSNS_YEAR", length = 4)
    private String bsnsYear;

    @Column(name = "BSNS_CODE", length = 20)
    private String bsnsCode;

    @Column(name = "EVENT_SVC_BEGIN_DE", length = 20)
    private String eventSvcBeginDe;

    @Column(name = "SVC_USE_NMPR_CO")
    private Integer svcUseNmprCo;

    @Column(name = "CHARGER_NM", length = 60)
    private String chargerNm;

    @Column(name = "EVENT_CN", length = 2500)
    private String eventCn;

    @Column(name = "EVENT_SVC_END_DE", length = 20)
    private String eventSvcEndDe;

    @Column(name = "EVENT_TY_CODE", length = 3)
    private String eventTyCode;

    @Column(name = "PRPARETG_CN", length = 2500)
    private String prparetgCn;

    @Column(name = "EVENT_CONFM_AT", length = 1)
    private String eventConfmAt;

    @Column(name = "EVENT_CONFM_DE", length = 20)
    private String eventConfmDe;

    public void update(String bsnsYear, String bsnsCode, String eventSvcBeginDe, int svcUseNmprCo,
                       String chargerNm, String eventCn, String eventSvcEndDe, String eventTyCode,
                       String prparetgCn, String eventConfmAt, String eventConfmDe, String userId) {
        this.bsnsYear = bsnsYear;
        this.bsnsCode = bsnsCode;
        this.eventSvcBeginDe = eventSvcBeginDe;
        this.svcUseNmprCo = svcUseNmprCo;
        this.chargerNm = chargerNm;
        this.eventCn = eventCn;
        this.eventSvcEndDe = eventSvcEndDe;
        this.eventTyCode = eventTyCode;
        this.prparetgCn = prparetgCn;
        this.eventConfmAt = eventConfmAt;
        this.eventConfmDe = eventConfmDe;
        this.lastModifiedBy = userId;
    }
}