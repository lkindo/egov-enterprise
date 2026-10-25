package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 페이지 파기 요청(ADR-0042). 게시를 중지한 페이지의 초안·모든 게시본·귀속 첨부를 되돌릴 수 없게 지운다. 잘못 누르지 않도록 주소를 한 번
 * 더 입력받고, 처리 근거 번호(민원·사고 접수 번호 등)를 민감 작업 감사에 남긴다 — 사유 본문은 받지 않는다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "콘텐츠 페이지 파기 요청")
public class CmsPagePurgeRequest {

    @Schema(description = "화면이 읽은 페이지 버전")
    @NotNull
    private Integer version;

    @Schema(description = "확인용으로 다시 입력한 주소(/pages/ 뒤)", maxLength = 100)
    @NotBlank
    @Size(max = 100)
    private String contsPathNm;

    @Schema(description = "처리 근거 번호(민원·사고 접수 번호 등). 영문·숫자·. _ - 만", maxLength = 200)
    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{0,199}")
    private String caseReference;
}
