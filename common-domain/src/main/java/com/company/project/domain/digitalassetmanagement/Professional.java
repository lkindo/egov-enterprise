package com.company.project.domain.digitalassetmanagement;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 전문가 JPA Entity
 * 연계 테이블: NDAMPRO
 */
@Entity
@Table(name = "NDAMPRO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ProfessionalId.class)
public class Professional extends BaseEntity {

    @Id
    @Column(name = "EXPERT_ID", length = 20)
    private String expertId;

    @Id
    @Column(name = "KNWLDG_TY_CODE", length = 20)
    private String typeCode;

    @Id
    @Column(name = "EXPERT_GRAD", length = 1)
    private String assessmentLevel;

    @Column(name = "EXPERT_DC", length = 2000)
    private String expertDescription;

    @Column(name = "EXPERT_CONFM_DE", length = 20)
    private String confirmedDate;

    @Builder
    public Professional(String expertId, String typeCode, String assessmentLevel, String expertDescription,
            String confirmedDate) {
        this.expertId = expertId;
        this.typeCode = typeCode;
        this.assessmentLevel = assessmentLevel;
        this.expertDescription = expertDescription;
        this.confirmedDate = confirmedDate;
    }
}
