package com.company.project.domain.digitalassetmanagement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeInfSearchResult {
    private String knowledgeId;
    private String title;
    private String organizationName;
    private String typeName;
    private String userName;
    private String evaluationDate;
    private String firstRegisterId;
    private LocalDateTime createdDate;
}
