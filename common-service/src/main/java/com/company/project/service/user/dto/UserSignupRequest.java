package com.company.project.service.user.dto;

import com.company.project.domain.user.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserSignupRequest(
        @NotBlank(message = "?꾩씠?붾뒗 ?꾩닔 ?낅젰 ??ぉ?낅땲??") 
        @Size(min = 4, max = 20, message = "?꾩씠?붾뒗 4???댁긽 20???댄븯濡??낅젰?댁＜?몄슂.") 
        @Pattern(regexp = "^[a-zA-Z0-9]*$", message = "?꾩씠?붾뒗 ?곷Ц?먯? ?レ옄留?媛?ν빀?덈떎.") String userId,
        
        @NotBlank(message = "鍮꾨?踰덊샇???꾩닔 ?낅젰 ??ぉ?낅땲??") 
        @Size(min = 8, max = 100, message = "鍮꾨?踰덊샇??8???댁긽?쇰줈 ?낅젰?댁＜?몄슂.") String password,
        
        @NotBlank(message = "?ъ슜?먮챸? ?꾩닔 ?낅젰 ??ぉ?낅땲??") 
        @Size(min = 2, max = 60, message = "?ъ슜?먮챸? 2???댁긽 60???댄븯濡??낅젰?댁＜?몄슂.") String userNm,
        
        Role role,
        @Size(max = 100) String passwordHint,
        @Size(max = 100) String passwordCnsr
) {}
