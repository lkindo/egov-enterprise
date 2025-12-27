package com.company.project.service.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 그룹 관리 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupManageDto {
    /** 그룹 ID */
    private String groupId;
    /** 그룹 명 */
    private String groupNm;
    /** 그룹 설명 */
    private String groupDc;
    /** 그룹 생성일 */
    private String groupCreatDe;
}
