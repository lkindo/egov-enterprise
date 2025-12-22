package com.company.project.service.code.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 공통 코드 정보 DTO
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
