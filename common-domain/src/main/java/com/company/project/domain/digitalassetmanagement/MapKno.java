package com.company.project.domain.digitalassetmanagement;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Comment;

/**
 * 지식맵(지식유형) 엔티티
 * 테이블: NDAMMAPKNO (구 COMTNMAPKNO)
 */
@Entity
@Table(name = "NDAMMAPKNO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapKno extends BaseEntity {

    @Id
    @Column(name = "KNWLDG_TY_CODE", length = 20)
    @Comment("지식 유형 코드")
    private String typeCode;

    @Column(name = "ORGNZT_ID", length = 20, nullable = false)
    @Comment("조직(부서) ID")
    private String organizationId;

    @Column(name = "EXPERT_ID", length = 20)
    @Comment("전문가 ID")
    private String expertId;

    @Column(name = "KNWLDG_TY_NM", length = 100, nullable = false)
    @Comment("지식 유형 명칭")
    private String typeName;

    @Column(name = "CL_DE", length = 20)
    @Comment("분류 일자")
    private String classificationDate;

    @Column(name = "KNWLDG_URL", length = 255)
    @Comment("지식 URL")
    private String knowledgeUrl;

    @Builder
    public MapKno(String typeCode, String organizationId, String expertId, String typeName,
            String classificationDate, String knowledgeUrl) {
        this.typeCode = typeCode;
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.typeName = typeName;
        this.classificationDate = classificationDate;
        this.knowledgeUrl = knowledgeUrl;
    }
}