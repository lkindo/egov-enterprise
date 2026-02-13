package com.company.project.domain.system;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class AnnualLeaveId implements Serializable {
    private String occrrncYear;
    private String usid;
}
