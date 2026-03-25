package com.company.project.foundation.domain.log;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class WebLogSummaryId implements Serializable {
    private String occrrncDe;
    private String url;
}
