package com.company.project.service.vacation.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationDto {
    private String applcntId;
    private String vcatnSe;
    private String bgnde;
    private String endde;
    private String reqstDe;
    private String vcatnResn;
    private String occrrncYear;
    private String noonSe;
    private String sanctnerId;
    private String confmAt;
    private LocalDateTime sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;

    // Additional Fields for View
    private String applcntNm; // 신청자명
    private String orgnztNm; // 조직명
    private String sanctnDtNm; // 승인일시/명? Or 승인자명? Checking legacy usage.

    private String frstRegisterId;
    private String lastUpdusrId;
    private LocalDateTime frstRegisterPnttm;
    private LocalDateTime lastUpdusrPnttm;
}
