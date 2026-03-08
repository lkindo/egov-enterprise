package com.company.project.domain.vacation;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class AnnualLeaveId implements Serializable {
    private String occrrncYear;
    private String userId;
}
