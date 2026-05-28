package nuri.foundation.service.group.dto;

import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 그룹관리 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupManageDto {
    /** 그룹ID */
    @Size(max = 30)
    private String groupId;
    /** 그룹명 */
    @Size(max = 100)
    private String groupNm;
    /** 그룹설명 */
    @Size(max = 4000)
    private String groupDc;
    /** 그룹생성일 */
    private String groupCreatDe;
}
