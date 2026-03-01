package com.company.project.domain.digitalassetmanagement;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ProfessionalId implements Serializable {
    private String speId;
    private String knoTypeCd;
    private String appTypeCd;
}
