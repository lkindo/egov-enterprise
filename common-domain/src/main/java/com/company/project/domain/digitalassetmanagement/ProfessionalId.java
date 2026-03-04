package com.company.project.domain.digitalassetmanagement;

import lombok.*;

import java.io.Serializable;

/**
 * 전문가 ID (복합키)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ProfessionalId implements Serializable {
    private String expertId;
    private String typeCode;
    private String assessmentLevel;
}