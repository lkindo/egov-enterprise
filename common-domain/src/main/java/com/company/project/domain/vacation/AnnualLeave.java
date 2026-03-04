package com.company.project.domain.vacation;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "NINDVDLYRYCMANAGE")
@IdClass(AnnualLeaveId.class)
public class AnnualLeave extends BaseEntity {

    @Id
    @Column(name = "OCCRRNC_YEAR", length = 4)
    private String occrrncYear;

    @Id
    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "YRYC_OCCRRNC_CO")
    private Double occrncYrycCo;

    @Column(name = "USE_YRYC_CO")
    private Double useYrycCo;

    @Column(name = "REMNDR_YRYC_CO")
    private Double remndrYrycCo;

    /**
     * 연차 사용 시 사용일수 가산 및 잔여 연차 동기화
     */
    public void deductLeave(Double days) {
        if (this.useYrycCo == null)
            this.useYrycCo = 0.0;
        this.useYrycCo += days;
        syncRemaining();
    }

    /**
     * 잔여 연차 일수 동기화
     */
    public void syncRemaining() {
        if (this.occrncYrycCo == null)
            this.occrncYrycCo = 0.0;
        if (this.useYrycCo == null)
            this.useYrycCo = 0.0;
        this.remndrYrycCo = this.occrncYrycCo - this.useYrycCo;
    }
}