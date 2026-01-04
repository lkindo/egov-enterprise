package com.company.project.service.sanctn.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InformalSanctnDto {
    private String infrmlSanctnId;
    private String jobSeCode;
    private String jobSeNm;
    private String applcntId;
    private String applcntNm;
    private String reqstDe;
    private String sanctnerId;
    private String sanctnerNm;
    private String sanctnerOrgnztNm;
    private String confmAt;
    private LocalDateTime sanctnDt;
    private String returnResn;
}
