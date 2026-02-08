package com.company.project.service.user.dto;

import com.company.project.domain.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserSignupRequest(
        @NotBlank @Size(min = 4, max = 20) @Pattern(regexp = "^[a-zA-Z0-9]*$") String userId,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(min = 2, max = 60) String userNm,
        Role role,
        @Size(max = 100) String passwordHint,
        @Size(max = 100) String passwordCnsr
) {}
