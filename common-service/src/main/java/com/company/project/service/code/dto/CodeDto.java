package com.company.project.service.code.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * ?�듯???�붾�??뺣낫 DTO
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
