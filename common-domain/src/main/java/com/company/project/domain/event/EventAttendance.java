package com.company.project.domain.event;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 행사참석자 JPA Entity
 * 레거시 테이블: COMTNEVENTATDRN
 */
@Entity
@Table(name = "NEVENTATDRN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(EventAttendance.EventAttendanceId.class)
public class EventAttendance {

    @Id
    @Column(name = "APPLCNT_ID", length = 20)
    private String applcntId;

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "REQST_DE", length = 20)
    private String reqstDe;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private LocalDateTime sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public EventAttendance(String applcntId, String eventId, String reqstDe, String sanctnerId,
            String confmAt, String returnResn, String infrmlSanctnId,
            String frstRegisterId) {
        this.applcntId = applcntId;
        this.eventId = eventId;
        this.reqstDe = reqstDe;
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.infrmlSanctnId = infrmlSanctnId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void approve(String sanctnerId, String confmAt, String returnResn, String updusrId) {
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.sanctnDt = LocalDateTime.now();
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventAttendanceId implements Serializable {
        private String applcntId;
        private String eventId;
    }
}
