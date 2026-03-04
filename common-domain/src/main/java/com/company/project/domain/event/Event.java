package com.company.project.domain.event;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ??깃텢?온??JPA Entity
 * ??뉕탢?????뵠?? COMTNEVENTMANAGE
 */
@Entity(name = "DomainEvent")
@Table(name = "NEVENTMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Event {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "EVENT_SE", length = 2)
    private String eventSe;

    @Column(name = "EVENT_NM", length = 100, nullable = false)
    private String eventNm;

    @Column(name = "EVENT_PURPS", length = 200)
    private String eventPurps;

    @Column(name = "EVENT_BGNDE", length = 20)
    private String eventBeginDe;

    @Column(name = "EVENT_ENDDE", length = 20)
    private String eventEndDe;

    @Column(name = "EVENT_AUSPC_INSTT_NM", length = 100)
    private String eventAuspcInsttNm;

    @Column(name = "EVENT_MNGT_INSTT_NM", length = 100)
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

    @Column(name = "REFRN_URL", length = 255)
    private String refrnUrl;

    @Column(name = "RCEPT_BGNDE", length = 20)
    private String rceptBeginDe;

    @Column(name = "RCEPT_ENDDE", length = 20)
    private String rceptEndDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Event(String eventId, String eventSe, String eventNm, String eventPurps,
            String eventBeginDe, String eventEndDe, String eventAuspcInsttNm,
            String eventMngtInsttNm, String eventPlace, String eventCn,
            String ctOccrrncAt, Integer partcptCt, Integer psncpa, String refrnUrl,
            String rceptBeginDe, String rceptEndDe, String frstRegisterId) {
        this.eventId = eventId;
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
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String eventSe, String eventNm, String eventPurps, String eventBeginDe,
            String eventEndDe, String eventAuspcInsttNm, String eventMngtInsttNm,
            String eventPlace, String eventCn, String ctOccrrncAt, Integer partcptCt,
            Integer psncpa, String refrnUrl, String rceptBeginDe, String rceptEndDe,
            String updusrId) {
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
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}