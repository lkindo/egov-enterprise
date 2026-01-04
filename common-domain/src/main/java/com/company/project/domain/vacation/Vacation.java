package com.company.project.domain.vacation;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 휴가 관리 엔티티
 */
@Entity
@Table(name = "NVCATNMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Vacation extends BaseTimeEntity {

    @EmbeddedId
    private VacationId id;

    @Column(name = "ENDDE", length = 20, nullable = false)
    private String endde;

    @Column(name = "REQST_DE", length = 20)
    private String reqstDe;

    @Column(name = "VCATN_RESN", length = 200)
    private String vcatnResn;

    @Column(name = "OCCRRNC_YEAR", length = 4)
    private String occrrncYear;

    @Column(name = "NOON_SE", length = 1)
    private String noonSe;

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

    @Embeddable
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class VacationId implements Serializable {
        @Column(name = "APPLCNT_ID", length = 20)
        private String applcntId;

        @Column(name = "VCATN_SE", length = 2)
        private String vcatnSe;

        @Column(name = "BGNDE", length = 20)
        private String bgnde;
    }

    public void approve(String sanctnerId, String confmAt, String returnResn, String lastUpdusrId) {
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.sanctnDt = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
    }
}
