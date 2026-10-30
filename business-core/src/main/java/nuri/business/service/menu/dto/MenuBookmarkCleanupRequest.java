package nuri.business.service.menu.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.hibernate.validator.constraints.UniqueElements;

/** 확인 화면에서 사용한 권한·개수·본인 후보에 정리 요청을 결속한다. */
@Schema(description = "본인이 확인한 사용할 수 없는 즐겨찾기 정리")
public record MenuBookmarkCleanupRequest(
        @NotBlank @Size(max = 64)
        @Schema(description = "확인한 계정의 권한 버전", requiredMode = Schema.RequiredMode.REQUIRED)
        String expectedAuthorizationVersion,
        @NotNull @Min(0)
        @Schema(description = "확인한 서버 숨김 개수", requiredMode = Schema.RequiredMode.REQUIRED)
        Integer expectedServerUnavailableCount,
        @NotNull @Size(max = 30) @UniqueElements
        @ArraySchema(arraySchema = @Schema(requiredMode = Schema.RequiredMode.REQUIRED), uniqueItems = true,
                maxItems = 30, schema = @Schema(type = "integer", format = "int64", minimum = "1"))
        List<@NotNull @Positive Long> uiUnavailableMenuNos) {
}
