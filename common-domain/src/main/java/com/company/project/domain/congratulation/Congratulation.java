package com.company.project.domain.congratulation;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 경조사(Congratulation/Condolence) 엔티티
 */
@Entity
@Table(name = "NCTSNNMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Congratulation extends BaseTimeEntity {

    @Id
    @Column(name = "CTSNN_ID", length = 20)
    private String congratulationId;

    @Column(name = "USER_ID", length = 20, nullable = false)
    private String userId;

    @Column(name = "CTSNN_CODE", length = 2, nullable = false)
    private String congratulationCode;

    @Column(name = "REQST_DE", length = 20, nullable = false)
    private String requestDate;

    @Column(name = "CTSNN_NM", length = 255, nullable = false)
    private String congratulationName;

    @Column(name = "TRGTER_NM", length = 60, nullable = false)
    private String trgterName;

    @Column(name = "BRTHDY", length = 20)
    private String birthday;

    @Column(name = "OCCRRNC_DE", length = 20, nullable = false)
    private String occurrenceDate;

    @Column(name = "RELATE", length = 1)
    private String relate;

    @Column(name = "RM", length = 255)
    private String remark;

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

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String congratulationCode, String congratulationName, String requestDate, String trgterName,
            String birthday, String occurrenceDate, String relate, String remark, String lastUpdusrId) {
        this.congratulationCode = congratulationCode;
        this.congratulationName = congratulationName;
        this.requestDate = requestDate;
        this.trgterName = trgterName;
        this.birthday = birthday;
        this.occurrenceDate = occurrenceDate;
        this.relate = relate;
        this.remark = remark;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void approve(String confmAt, String returnResn, String lastUpdusrId) {
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.sanctnDt = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
    }

    public String getCtsnnId() {
        return congratulationId;
    }
}