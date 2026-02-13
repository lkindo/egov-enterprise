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
@Table(name = "NINDVDLYRYCMANAGE")
@IdClass(AnnualLeaveId.class)
public class AnnualLeave extends BaseEntity {

    @Id
    @Column(name = "OCCRRNC_YEAR", length = 4)
    private String occrrncYear;

    @Id
    @Column(name = "USID", length = 20)
    private String usid;

    @Column(name = "OCCRNC_YRYC_CO")
    private Double occrncYrycCo;

    @Column(name = "USE_YRYC_CO")
    private Double useYrycCo;

    @Column(name = "REMNDR_YRYC_CO")
    private Double remndrYrycCo;

    /**
     * 사용 연차 차감 및 잔여 일수 갱신
     */
    public void deductLeave(Double days) {
        if (this.useYrycCo == null) this.useYrycCo = 0.0;
        this.useYrycCo += days;
        syncRemaining();
    }

    /**
     * 잔여 일수 동기화
     */
    public void syncRemaining() {
        if (this.occrncYrycCo == null) this.occrncYrycCo = 0.0;
        if (this.useYrycCo == null) this.useYrycCo = 0.0;
        this.remndrYrycCo = this.occrncYrycCo - this.useYrycCo;
    }
}
