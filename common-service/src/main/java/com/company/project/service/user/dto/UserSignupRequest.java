package com.company.project.service.user.dto;

import com.company.project.domain.user.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserSignupRequest(
        @NotBlank(message = "?„ì´?”ëŠ” ?„ìˆ˜ ?…ë ¥ ??ª©?…ë‹ˆ??") 
        @Size(min = 4, max = 20, message = "?„ì´?”ëŠ” 4???´ìƒ 20???´í•˜ë¡??…ë ¥?´ì£¼?¸ìš”.") 
        @Pattern(regexp = "^[a-zA-Z0-9]*$", message = "?„ì´?”ëŠ” ?ë¬¸?ì? ?«ìë§?ê°€?¥í•©?ˆë‹¤.") String userId,
        
        @NotBlank(message = "ë¹„ë?ë²ˆí˜¸???„ìˆ˜ ?…ë ¥ ??ª©?…ë‹ˆ??") 
        @Size(min = 8, max = 100, message = "ë¹„ë?ë²ˆí˜¸??8???´ìƒ?¼ë¡œ ?…ë ¥?´ì£¼?¸ìš”.") String password,
        
        @NotBlank(message = "?¬ìš©?ëª…?€ ?„ìˆ˜ ?…ë ¥ ??ª©?…ë‹ˆ??") 
        @Size(min = 2, max = 60, message = "?¬ìš©?ëª…?€ 2???´ìƒ 60???´í•˜ë¡??…ë ¥?´ì£¼?¸ìš”.") String userNm,
        
        Role role,
        @Size(max = 100) String passwordHint,
        @Size(max = 100) String passwordCnsr
) {}
