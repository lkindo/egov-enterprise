package com.company.project.service.duty.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DutyDiaryDto {
    private String bndtId;
    private String bndtDe;
    private String bndtCeckSe;
    private String bndtCeckCd;
    private String chckSttus;
}
