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
@Table(name = "NEVENTINFO")
public class Event extends BaseEntity {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "EVENT_SE", length = 2)
    private String eventSe;

    @Column(name = "EVENT_NM", length = 60)
    private String eventNm;

    @Column(name = "EVENT_PURPS", length = 200)
    private String eventPurps;

    @Column(name = "EVENT_BEGIN_DE", length = 20)
    private String eventBeginDe;

    @Column(name = "EVENT_END_DE", length = 20)
    private String eventEndDe;

    @Column(name = "EVENT_AUSPC_INSTT_NM", length = 60)
    private String eventAuspcInsttNm;

    @Column(name = "EVENT_MNGT_INSTT_NM", length = 60)
    private String eventMngtInsttNm;

    @Column(name = "EVENT_PLACE", length = 200)
    private String eventPlace;

    @Column(name = "EVENT_CN", length = 2500)
    private String eventCn;

    @Column(name = "CT_OCCRRNC_AT", length = 1)
    private String ctOccrrncAt;

    @Column(name = "PARTCPT_CT")
    private Integer partcptCt;

    @Column(name = "PSNCPA")
    private Integer psncpa;

    @Column(name = "REFRN_URL", length = 1024)
    private String refrnUrl;

    @Column(name = "RCEPT_BEGIN_DE", length = 20)
    private String rceptBeginDe;

    @Column(name = "RCEPT_END_DE", length = 20)
    private String rceptEndDe;

    public void update(String eventSe, String eventNm, String eventPurps, String eventBeginDe, String eventEndDe,
                       String eventAuspcInsttNm, String eventMngtInsttNm, String eventPlace, String eventCn,
                       String ctOccrrncAt, int partcptCt, int psncpa, String refrnUrl,
                       String rceptBeginDe, String rceptEndDe, String userId) {
        this.eventSe = eventSe;
        this.eventNm = eventNm;
        this.eventPurps = eventPurps;
        this.eventBeginDe = eventBeginDe;
        this.eventEndDe = eventEndDe;
        this.eventAuspcInsttNm = eventAuspcInsttNm;
        this.eventMngtInsttNm = eventMngtInsttNm;
        this.eventPlace = eventPlace;
        this.eventCn = eventCn;
        this.ctOccrrncAt = ctOccrrncAt;
        this.partcptCt = partcptCt;
        this.psncpa = psncpa;
        this.refrnUrl = refrnUrl;
        this.rceptBeginDe = rceptBeginDe;
        this.rceptEndDe = rceptEndDe;
        this.lastModifiedBy = userId;
    }
}
