package com.company.project.service.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * æ´¹ëªƒï¼??¿Â€??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupManageDto {
    /** æ´¹ëªƒï¼?ID */
    private String groupId;
    /** æ´¹ëªƒï¼?ï§?*/
    private String groupNm;
    /** æ´¹ëªƒï¼???»ì±¸ */
    private String groupDc;
    /** æ´¹ëªƒï¼???¹ê½¦??*/
    private String groupCreatDe;
}
