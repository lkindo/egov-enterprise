package com.company.project.foundation.service.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAuthorityDto {
    @NonNull
    private String uniqId;
    @NonNull
    private String authorCode;
    private String mberTyCode;
    private String userNm; // For display purposes if needed
}
