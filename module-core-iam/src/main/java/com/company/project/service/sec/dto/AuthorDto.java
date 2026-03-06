package com.company.project.service.sec.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorDto {
    @org.springframework.lang.NonNull
    private String authorCode;
    @org.springframework.lang.NonNull
    private String authorNm;
    private String authorDc;
    private String authorCreatDe;
}
