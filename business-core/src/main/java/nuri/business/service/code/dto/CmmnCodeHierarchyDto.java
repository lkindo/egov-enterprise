package nuri.business.service.code.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 공통코드 계층(코드그룹의 소속 분류) 일괄 저장 전용 DTO.
 *
 * <p>일반 수정용 {@link CmmnCodeDto} 는 {@code useYn} 이 @NotBlank 라서, 탐색기 드래그앤드롭이 보내는
 * "소속만 바꾸는" 최소 payload 로는 쓸 수 없다. 계층 저장은 명칭·설명·사용여부를 건드리지 않으므로
 * 전용 DTO 로 계약을 좁힌다(부서 관리의 계층 일괄 저장과 동일한 취지).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "공통코드 계층 일괄 저장 항목")
public class CmmnCodeHierarchyDto {

    @Schema(description = "코드 ID (이동 대상 코드그룹)", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 20)
    private String cdId;

    @Schema(description = "이동 후 소속 분류코드", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 12)
    private String clsfCd;
}
