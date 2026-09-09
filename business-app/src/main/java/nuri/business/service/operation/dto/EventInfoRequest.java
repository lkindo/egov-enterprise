package nuri.business.service.operation.dto;

import jakarta.validation.constraints.NotBlank;
import io.swagger.v3.oas.annotations.media.Schema;

/** Require a name on writes while keeping historical unnamed events readable. */
@Schema(description = "행사 등록·수정 입력")
@nuri.foundation.core.validation.YmdRange(start = "evntBgngYmd", end = "evntEndYmd")
public class EventInfoRequest extends EventInfoDto {
    @Override
    @NotBlank
    public String getEvntNm() {
        return super.getEvntNm();
    }
}
