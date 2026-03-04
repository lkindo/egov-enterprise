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
public class ProfessionalSearchResult {
    private String organizationName;
    private String typeCode;
    private String typeName;
    private String userName;
    private String assessmentLevel;
    private String confirmedDate;
    private String expertId;
    private String firstRegisterId;
    private LocalDateTime createdDate;
}