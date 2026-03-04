package com.company.project.domain.digitalassetmanagement;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 전문가 정보 엔티티
 * 테이블: NDAMPRO (구 COMTNPRO)
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
    @Comment("전문가 ID")
    private String expertId;

    @Id
    @Column(name = "KNWLDG_TY_CODE", length = 20)
    @Comment("지식 유형 코드")
    private String typeCode;

    @Id
    @Column(name = "EXPERT_GRAD", length = 1)
    @Comment("전문가 등급 (평가 레벨)")
    private String assessmentLevel;

    @Column(name = "EXPERT_DC", length = 2000)
    @Comment("전문가 상세 설명")
    private String expertDescription;

    @Column(name = "EXPERT_CONFM_DE", length = 20)
    @Comment("전문가 승인 일자")
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