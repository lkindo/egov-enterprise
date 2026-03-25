package com.company.project.foundation.domain.log;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SysLogSummaryId implements Serializable {
    private String srvcNm;
    private String methodNm;
    private String occrrncDe;
}
