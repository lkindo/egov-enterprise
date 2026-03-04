package com.company.project.domain.digitalassetmanagement;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 지식맵(조직분류) JPA Entity
 * 연계 테이블: NDAMMAPTEAM
 */
@Entity
@Table(name = "NDAMMAPTEAM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapTeam extends BaseEntity {

    @Id
    @Column(name = "ORGNZT_ID", length = 20)
    private String organizationId;

    @Column(name = "ORGNZT_NM", length = 100, nullable = false)
    private String organizationName;

    @Column(name = "CL_DE", length = 20)
    private String classificationDate;

    @Column(name = "KNWLDG_URL", length = 255)
    private String knowledgeUrl;

    @Builder
    public MapTeam(String organizationId, String organizationName, String classificationDate, String knowledgeUrl) {
        this.organizationId = organizationId;
        this.organizationName = organizationName;
        this.classificationDate = classificationDate;
        this.knowledgeUrl = knowledgeUrl;
    }
}