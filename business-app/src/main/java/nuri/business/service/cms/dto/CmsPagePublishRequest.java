package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 게시 요청(ADR-0039 결정 7). 저장된 초안을 게시한다 — 같은 버전으로 다시 보내면 버전이 달라 409 가 되므로 중복 게시본이 생기지 않는다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "저장된 초안 게시 요청")
public class CmsPagePublishRequest {

    @Schema(description = "화면이 읽은 페이지 버전")
    @NotNull
    private Integer version;

    @Schema(description = "변경 설명(게시 이력에 남는다)", maxLength = 4000)
    @Size(max = 4000)
    private String rvsnRsn;
}
