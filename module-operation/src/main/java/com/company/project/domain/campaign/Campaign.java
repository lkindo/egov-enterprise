package com.company.project.domain.campaign;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * ??깃텢 筌?쥚????온???酉???
 */
@Entity
@Table(name = "NEVENTINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Campaign extends BaseTimeEntity {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "EVENT_SVC_BGNDE", length = 20)
    private String eventBeginDe;

    @Column(name = "EVENT_SVC_ENDDE", length = 20)
    private String eventEndDe;

    @Column(name = "SVC_USE_NMPR_CO")
    private Long svcUseNmprCo;

    @Column(name = "CHARGER_NM", length = 60)
    private String chargerNm;

    @Column(name = "EVENT_CN", length = 1000)
    private String eventCn;

    @Column(name = "EVENT_TY_CODE", length = 2)
    private String eventTyCode;

    @Column(name = "PRPARETG_CN", length = 1000)
    private String prparetgCn;

    @Column(name = "EVENT_CONFM_AT", length = 1)
    private String eventConfmAt;

    @Column(name = "EVENT_CONFM_DE", length = 20)
    private String eventConfmDe;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CampaignExternalHr> externalHrs = new ArrayList<>();

    public void update(String eventBeginDe, String eventEndDe, Long svcUseNmprCo, String chargerNm, String eventCn,
            String eventTyCode, String eventConfmAt, String eventConfmDe, String prparetgCn, String lastUpdusrId) {
        this.eventBeginDe = eventBeginDe;
        this.eventEndDe = eventEndDe;
        this.svcUseNmprCo = svcUseNmprCo;
        this.chargerNm = chargerNm;
        this.eventCn = eventCn;
        this.eventTyCode = eventTyCode;
        this.eventConfmAt = eventConfmAt;
        this.eventConfmDe = eventConfmDe;
        this.prparetgCn = prparetgCn;
        this.lastUpdusrId = lastUpdusrId;
    }
}
