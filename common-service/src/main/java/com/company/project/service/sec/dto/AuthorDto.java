package com.company.project.service.sec.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorDto {
    private String authorCode;
    private String authorNm;
    private String authorDc;
    private String authorCreatDe;
}
