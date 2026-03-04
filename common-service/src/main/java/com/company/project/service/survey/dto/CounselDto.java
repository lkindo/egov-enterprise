package com.company.project.service.survey.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CounselDto {
    private String counselId;
    private String counselSubject;
    private String counselContent;
    private String openAt;
    private String writeDate;
    private String writerId;
    private String writerNm;
    private String managerContent;
    private String managerDate;
    private String status;
}