package nuri.api.controller.system;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 조직도 계층 일괄 저장 전용 요청 항목.
 *
 * <p>부서 등록/수정 DTO와 달리 계층 변경에 필요한 값만 받는다.</p>
 */
public record DeptHierarchyItemRequest(
        @NotBlank @Size(max = 20) String ognzId,
        @Size(max = 20) String upOgnzId,
        Integer sortOrdr
) {
}
