package com.company.project.domain.digitalassetmanagement;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 지식요청/답변 JPA Entity
 * 연계 테이블: NDAMCALRES
 */
@Entity
@Table(name = "NDAMCALRES")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KnowledgeRequest extends BaseEntity {

    @Id
    @Column(name = "KNWLDG_ID", length = 20)
    private String knowledgeId;

    @Column(name = "KNWLDG_NM", length = 255, nullable = false)
    private String title;

    @Column(name = "KNWLDG_CN", length = 4000)
    private String content;

    @Column(name = "KNWLDG_TY_CODE", length = 20)
    private String typeCode;

    @Column(name = "ORGNZT_ID", length = 20)
    private String organizationId;

    @Column(name = "EXPERT_ID", length = 20)
    private String expertId;

    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String attachedFileId;

    @Column(name = "PARNTS_KNWLDG_ID", length = 20)
    private String parentKnowledgeId;

    @Column(name = "ANSWER_DP")
    private Integer answerDepth;

    @Column(name = "ANSWER_ORDR")
    private Integer answerOrder;

    @Column(name = "ANSWER_GROUP_NO")
    private Long answerGroupNumber;

    @Builder
    public KnowledgeRequest(String knowledgeId, String title, String content, String typeCode,
            String organizationId, String expertId, String emplyrId, String attachedFileId,
            String parentKnowledgeId, Integer answerDepth, Integer answerOrder, Long answerGroupNumber) {
        this.knowledgeId = knowledgeId;
        this.title = title;
        this.content = content;
        this.typeCode = typeCode;
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.emplyrId = emplyrId;
        this.attachedFileId = attachedFileId;
        this.parentKnowledgeId = parentKnowledgeId;
        this.answerDepth = answerDepth;
        this.answerOrder = answerOrder;
        this.answerGroupNumber = answerGroupNumber;
    }
}