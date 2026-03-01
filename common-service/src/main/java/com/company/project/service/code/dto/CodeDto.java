package com.company.project.service.code.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * ?¨ë“¯???„ë¶¾ë±??ëº£ë‚« DTO
 */
@Getter
@Builder
public class CodeDto {
    private String codeGroupId;
    private String code;
    private String codeNm;
    private String codeDc;
    private String useAt;
}
