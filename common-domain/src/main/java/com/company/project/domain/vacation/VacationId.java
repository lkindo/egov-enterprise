package com.company.project.domain.vacation;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class VacationId implements Serializable {
    private String applcntId;
    private String vcatnSe;
    private String bgnde;
}
