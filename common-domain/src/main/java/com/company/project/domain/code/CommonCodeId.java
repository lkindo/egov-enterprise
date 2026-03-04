package com.company.project.domain.code;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CommonCodeId implements Serializable {
    private String codeGroupId;
    private String code;
}
