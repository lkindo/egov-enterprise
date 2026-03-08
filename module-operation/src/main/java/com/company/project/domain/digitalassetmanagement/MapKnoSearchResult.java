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
public class MapKnoSearchResult {
    private String typeCode;
    private String typeName;
    private String organizationName;
    private String expertId;
    private String knowledgeUrl;
    private String classificationDate;
    private String firstRegisterId;
    private LocalDateTime createdDate;
}
