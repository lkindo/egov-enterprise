package com.company.project.service.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAuthorityDto {
    private String uniqId;
    private String authorCode;
    private String mberTyCode;
    private String userNm; // For display purposes if needed
}
