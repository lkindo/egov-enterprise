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
}
