package com.company.project.service.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 洹몃�??�??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupManageDto {
    /** 洹몃�?ID */
    private String groupId;
    /** 洹몃�?�?*/
    private String groupNm;
    /** 洹몃�???�챸 */
    private String groupDc;
    /** 洹몃�???�꽦??*/
    private String groupCreatDe;
}
