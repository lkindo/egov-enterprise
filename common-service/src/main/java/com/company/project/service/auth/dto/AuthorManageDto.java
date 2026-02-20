package com.company.project.service.auth.dto;

import egovframework.com.cmm.ComDefaultVO;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;

/**
 * 沅뚰븳 愿由?DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorManageDto extends ComDefaultVO {
    /** 沅뚰븳 肄붾뱶 */
    @NotBlank(message = "沅뚰븳 肄붾뱶???꾩닔 ?낅젰 ??ぉ?낅땲??")
    @Size(max = 30)
    @NonNull
    private String authorCode;

    /** 沅뚰븳 紐?*/
    @NotBlank(message = "沅뚰븳 紐낆? ?꾩닔 ?낅젰 ??ぉ?낅땲??")
    @Size(max = 60)
    @NonNull
    private String authorNm;

    /** 沅뚰븳 ?ㅻ챸 */
    @Size(max = 200)
    private String authorDc;

    /** 沅뚰븳 ?앹꽦??*/
    private String authorCreatDe;
}
