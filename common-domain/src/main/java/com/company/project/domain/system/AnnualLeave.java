package com.company.project.domain.system;

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
    @Column(name = "USID", length = 20)
    private String usid;

    @Column(name = "OCCRNC_YRYC_CO")
    private Double occrncYrycCo;

    @Column(name = "USE_YRYC_CO")
    private Double useYrycCo;

    @Column(name = "REMNDR_YRYC_CO")
    private Double remndrYrycCo;

    /**
     * ?????怨쀪컧 筌△몿而?獄??遺용연 ??깅땾 揶쏄퉮??
     */
    public void deductLeave(Double days) {
        if (this.useYrycCo == null)
            this.useYrycCo = 0.0;
        this.useYrycCo += days;
        syncRemaining();
    }

    /**
     * ?遺용연 ??깅땾 ??녿┛??
     */
    public void syncRemaining() {
        if (this.occrncYrycCo == null)
            this.occrncYrycCo = 0.0;
        if (this.useYrycCo == null)
            this.useYrycCo = 0.0;
        this.remndrYrycCo = this.occrncYrycCo - this.useYrycCo;
    }
}
