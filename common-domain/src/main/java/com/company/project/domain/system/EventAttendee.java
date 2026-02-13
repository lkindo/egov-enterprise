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
@Table(name = "NEVENTATDRN")
@IdClass(EventAttendeeId.class)
public class EventAttendee extends BaseEntity {

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
    private String sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;

    public void update(String sanctnerId, String confmAt, String sanctnDt, String returnResn, String userId) {
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.sanctnDt = sanctnDt;
        this.returnResn = returnResn;
        this.lastModifiedBy = userId;
    }
}
