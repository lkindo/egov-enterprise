package com.company.project.foundation.service.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 부서별 권한 일괄 할당 요청 DTO
 */
@Getter
@Setter
@Schema(description = "부서별 권한 일괄 할당 요청")
public class DeptAuthorBatchRequest {

    @Schema(description = "부서 아이디 (부서 코드)", example = "ORGNZT_0000000000001")
    private String deptId;

    @Schema(description = "부서에 부여할 권한 코드", example = "ROLE_USER")
    private String authorCode;

    @Schema(description = "부서 내 모든 사용자에게 적용 여부", example = "true")
    private boolean allMembers;

    @Schema(description = "allMembers가 false인 경우 적용할 사용자 ID 목록")
    private List<String> userIds;
}
