package com.company.project.domain.event;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 이벤트 정보 Entity
 * 레거시 테이블: NEVENTINFO
 */
@Entity
@Table(name = "NEVENTINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventInfo extends BaseEntity {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "EVENT_SVC_BGNDE", length = 10)
    private String eventSvcBeginDe;

    @Column(name = "EVENT_SVC_ENDDE", length = 10)
    private String eventSvcEndDe;

    @Column(name = "SVC_USE_NMPR_CO")
    private Integer svcUseNmprCo;

    @Column(name = "CHARGER_NM", length = 50)
    private String chargerNm;

    @Column(name = "EVENT_CN", columnDefinition = "TEXT")
    private String eventCn;

    @Column(name = "EVENT_TY_CODE", length = 3)
    private String eventTyCode;

    @Column(name = "PRPARETG_CN", columnDefinition = "TEXT")
    private String prparetgCn;

    @Column(name = "EVENT_CONFM_AT", length = 1)
    private String eventConfmAt;

    @Column(name = "EVENT_CONFM_DE", length = 10)
    private String eventConfmDe;

    @OneToMany(mappedBy = "eventId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExternalHr> externalHrs = new ArrayList<>();

    @Builder
    public EventInfo(String eventId, String eventSvcBeginDe, String eventSvcEndDe, Integer svcUseNmprCo,
                    String chargerNm, String eventCn, String eventTyCode, String prparetgCn,
                    String eventConfmAt, String eventConfmDe) {
        this.eventId = eventId;
        this.eventSvcBeginDe = eventSvcBeginDe;
        this.eventSvcEndDe = eventSvcEndDe;
        this.svcUseNmprCo = svcUseNmprCo;
        this.chargerNm = chargerNm;
        this.eventCn = eventCn;
        this.eventTyCode = eventTyCode;
        this.prparetgCn = prparetgCn;
        this.eventConfmAt = eventConfmAt != null ? eventConfmAt : "N";
        this.eventConfmDe = eventConfmDe;
    }

    public void update(String eventSvcBeginDe, String eventSvcEndDe, Integer svcUseNmprCo,
                      String chargerNm, String eventCn, String eventTyCode, String prparetgCn,
                      String eventConfmAt, String eventConfmDe) {
        this.eventSvcBeginDe = eventSvcBeginDe;
        this.eventSvcEndDe = eventSvcEndDe;
        this.svcUseNmprCo = svcUseNmprCo;
        this.chargerNm = chargerNm;
        this.eventCn = eventCn;
        this.eventTyCode = eventTyCode;
        this.prparetgCn = prparetgCn;
        this.eventConfmAt = eventConfmAt;
        this.eventConfmDe = eventConfmDe;
    }
}
