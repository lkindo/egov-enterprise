package com.company.project.service.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 洹몃９ 愿由?DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupManageDto {
    /** 洹몃９ ID */
    private String groupId;
    /** 洹몃９ 紐?*/
    private String groupNm;
    /** 洹몃９ ?ㅻ챸 */
    private String groupDc;
    /** 洹몃９ ?앹꽦??*/
    private String groupCreatDe;
}
