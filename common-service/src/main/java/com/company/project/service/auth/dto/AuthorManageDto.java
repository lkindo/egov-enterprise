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
 * 沅뚰�??�??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorManageDto extends ComDefaultVO {
    /** 沅뚰�??�붾�?*/
    @NotBlank(message = "沅뚰�??�붾�???꾩닔 ??�젰 ?????�땲??")
    @Size(max = 30)
    @NonNull
    private String authorCode;

    /** 沅뚰�?�?*/
    @NotBlank(message = "沅뚰�?紐낆? ?꾩닔 ??�젰 ?????�땲??")
    @Size(max = 60)
    @NonNull
    private String authorNm;

    /** 沅뚰�???�챸 */
    @Size(max = 200)
    private String authorDc;

    /** 沅뚰�???�꽦??*/
    private String authorCreatDe;
}
