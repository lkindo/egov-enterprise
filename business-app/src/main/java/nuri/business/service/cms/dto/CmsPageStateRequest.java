package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 게시 중지·보관·보관 해제 요청. 화면이 읽은 버전과 다르면 409 다. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "콘텐츠 페이지 상태 변경 요청")
public class CmsPageStateRequest {

    @Schema(description = "화면이 읽은 페이지 버전")
    @NotNull
    private Integer version;
}
