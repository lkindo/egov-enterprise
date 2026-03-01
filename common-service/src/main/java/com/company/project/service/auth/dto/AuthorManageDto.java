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
 * æ²…ëš°ë¸??¿Â€??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorManageDto extends ComDefaultVO {
    /** æ²…ëš°ë¸??„ë¶¾ë±?*/
    @NotBlank(message = "æ²…ëš°ë¸??„ë¶¾ë±???ê¾©ë‹” ??…ì ° ?????…ë•²??")
    @Size(max = 30)
    @NonNull
    private String authorCode;

    /** æ²…ëš°ë¸?ï§?*/
    @NotBlank(message = "æ²…ëš°ë¸?ï§ë‚†? ?ê¾©ë‹” ??…ì ° ?????…ë•²??")
    @Size(max = 60)
    @NonNull
    private String authorNm;

    /** æ²…ëš°ë¸???»ì±¸ */
    @Size(max = 200)
    private String authorDc;

    /** æ²…ëš°ë¸???¹ê½¦??*/
    private String authorCreatDe;
}
