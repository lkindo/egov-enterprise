package com.company.project.service.auth.dto;

import egovframework.com.cmm.ComDefaultVO;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @NotBlank(message = "권한 코드는 필수 입력 항목입니다.")
    @Size(max = 30)
    private String authorCode;

    /** 권한 명 */
    @NotBlank(message = "권한 명은 필수 입력 항목입니다.")
    @Size(max = 60)
    private String authorNm;

    /** 권한 설명 */
    @Size(max = 200)
    private String authorDc;

    /** 권한 생성일 */
    private String authorCreatDe;
}
