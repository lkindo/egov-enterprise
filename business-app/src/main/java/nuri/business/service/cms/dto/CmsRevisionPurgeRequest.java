package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 지난 게시본 하나의 파기 요청(ADR-0042). 지금 보이는 게시본은 파기할 수 없다 — 고친 본을 다시 게시하거나 게시를 중지한 뒤 파기한다.
 * 처리 근거 번호를 민감 작업 감사에 남기고 사유 본문은 받지 않는다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "콘텐츠 게시본 파기 요청")
public class CmsRevisionPurgeRequest {

    @Schema(description = "화면이 읽은 페이지 버전")
    @NotNull
    private Integer version;

    @Schema(description = "처리 근거 번호(민원·사고 접수 번호 등). 영문·숫자·. _ - 만", maxLength = 200)
    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{0,199}")
    private String caseReference;
}
