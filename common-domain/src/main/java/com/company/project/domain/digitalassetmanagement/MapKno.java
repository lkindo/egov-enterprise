package com.company.project.domain.digitalassetmanagement;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 지식맵(지식유형) JPA Entity
 * 연계 테이블: NDAMMAPKNO
 */
@Entity
@Table(name = "NDAMMAPKNO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapKno extends BaseEntity {

    @Id
    @Column(name = "KNWLDG_TY_CODE", length = 20)
    private String typeCode;

    @Column(name = "ORGNZT_ID", length = 20, nullable = false)
    private String organizationId;

    @Column(name = "EXPERT_ID", length = 20)
    private String expertId;

    @Column(name = "KNWLDG_TY_NM", length = 100, nullable = false)
    private String typeName;

    @Column(name = "CL_DE", length = 20)
    private String classificationDate;

    @Column(name = "KNWLDG_URL", length = 255)
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
