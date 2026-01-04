package com.company.project.domain.vacation;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;
import java.io.Serializable;

/**
 * 개인별 연차 관리 엔티티
 */
@Entity
@Table(name = "NINDVDLYRYCMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AnnualLeave extends BaseTimeEntity {

    @EmbeddedId
    private AnnualLeaveId id;

    @Column(name = "YRYC_OCCRRNC_CO")
    private double occrncYrycCo;

    @Column(name = "USE_YRYC_CO")
    private double useYrycCo;

    @Column(name = "REMNDR_YRYC_CO")
    private double remndrYrycCo;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Embeddable
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class AnnualLeaveId implements Serializable {
        @Column(name = "USER_ID", length = 20)
        private String userId;

        @Column(name = "OCCRRNC_YEAR", length = 4)
        private String occrrncYear;
    }

    public void updateUsage(double useYrycCo, double remndrYrycCo, String lastUpdusrId) {
        this.useYrycCo = useYrycCo;
        this.remndrYrycCo = remndrYrycCo;
        this.lastUpdusrId = lastUpdusrId;
    }
}
