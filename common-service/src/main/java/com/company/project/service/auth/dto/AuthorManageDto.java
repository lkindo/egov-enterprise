package com.company.project.service.auth.dto;

import egovframework.com.cmm.ComDefaultVO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 권한 관리 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorManageDto extends ComDefaultVO {
    /** 권한 코드 */
    private String authorCode;
    /** 권한 명 */
    private String authorNm;
    /** 권한 설명 */
    private String authorDc;
    /** 권한 생성일 */
    private String authorCreatDe;
}
