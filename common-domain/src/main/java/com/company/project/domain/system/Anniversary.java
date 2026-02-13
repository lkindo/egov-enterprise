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
@Table(name = "NANNVRSRYMANAGE")
public class Anniversary extends BaseEntity {

    @Id
    @Column(name = "ANN_ID", length = 20)
    private String annId;

    @Column(name = "USID", length = 20)
    private String usid;

    @Column(name = "ANNVRSRY_SE", length = 2)
    private String annvrsrySe;

    @Column(name = "ANNVRSRY_NM", length = 255)
    private String annvrsryNm;

    @Column(name = "ANNVRSRY_DE", length = 20)
    private String annvrsryDe;

    @Column(name = "CLDR_SE", length = 1)
    private String cldrSe;

    @Column(name = "REPTIT_SE", length = 1)
    private String reptitSe;

    @Column(name = "ANNVRSRY_SETUP", length = 1)
    private String annvrsrySetup;

    @Column(name = "ANNVRSRY_BEGIN_DE", length = 20)
    private String annvrsryBeginDe;

    @Column(name = "MEMO", length = 1000)
    private String memo;
}
