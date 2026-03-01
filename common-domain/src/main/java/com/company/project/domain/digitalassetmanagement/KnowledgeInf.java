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
 * 지식정보 엔티티
 * 테이블: NDAMKNOIFM (구 COMTNKNOWLDGINFO)
 */
@Entity
@Table(name = "NDAMKNOIFM")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KnowledgeInf extends BaseEntity {

    @Id
    @Column(name = "KNWLDG_ID", length = 20)
    @Comment("지식 ID")
    private String knowledgeId;

    @Column(name = "KNWLDG_NM", length = 255, nullable = false)
    @Comment("지식 제목")
    private String title;

    @Column(name = "KNWLDG_CN", length = 4000)
    @Comment("지식 내용")
    private String content;

    @Column(name = "KNWLDG_TY_CODE", length = 20)
    @Comment("지식 유형 코드")
    private String typeCode;

    @Column(name = "ORGNZT_ID", length = 20)
    @Comment("조직(부서) ID")
    private String organizationId;

    @Column(name = "EXPERT_ID", length = 20)
    @Comment("전문가 ID")
    private String expertId;

    @Column(name = "OTHBC_AT", length = 1)
    @Comment("공개 여부 (Y/N)")
    private String isPublic;

    @Column(name = "EVL_DE", length = 20)
    @Comment("평가 일자")
    private String evaluationDate;

    @Column(name = "KNWLDG_EVL", length = 1)
    @Comment("평가 등급")
    private String evaluationGrade;

    @Column(name = "DSUSE_DE", length = 20)
    @Comment("폐기 일자")
    private String disuseDate;

    @Column(name = "ATCH_FILE_ID", length = 20)
    @Comment("첨부 파일 ID")
    private String attachedFileId;

    @Builder
    public KnowledgeInf(String knowledgeId, String title, String content, String typeCode,
            String organizationId, String expertId, String isPublic, String evaluationDate, String evaluationGrade,
            String disuseDate, String attachedFileId) {
        this.knowledgeId = knowledgeId;
        this.title = title;
        this.content = content;
        this.typeCode = typeCode;
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.isPublic = isPublic;
        this.evaluationDate = evaluationDate;
        this.evaluationGrade = evaluationGrade;
        this.disuseDate = disuseDate;
        this.attachedFileId = attachedFileId;
    }
}
