package com.company.project.service.user.dto;

import com.company.project.domain.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserSignupRequest(
        @NotBlank(message = "아이디는 필수 입력 항목입니다.") 
        @Size(min = 4, max = 20, message = "아이디는 4자 이상 20자 이하로 입력해주세요.") 
        @Pattern(regexp = "^[a-zA-Z0-9]*$", message = "아이디는 영문자와 숫자만 가능합니다.") String userId,
        
        @NotBlank(message = "비밀번호는 필수 입력 항목입니다.") 
        @Size(min = 8, max = 100, message = "비밀번호는 8자 이상으로 입력해주세요.") String password,
        
        @NotBlank(message = "사용자명은 필수 입력 항목입니다.") 
        @Size(min = 2, max = 60, message = "사용자명은 2자 이상 60자 이하로 입력해주세요.") String userNm,
        
        Role role,
        @Size(max = 100) String passwordHint,
        @Size(max = 100) String passwordCnsr
) {}
