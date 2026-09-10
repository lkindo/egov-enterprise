package nuri.business.service.survey.dto;

import jakarta.validation.constraints.Pattern;
import nuri.foundation.core.validation.Ymd;
import nuri.foundation.core.validation.YmdRange;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Writes require calendar dates. Keep the legacy read DTO readable so existing
 * truncated dates can be inspected and corrected without fabricating a day.
 */
@Schema(description = "온라인 설문 등록·수정 입력")
@YmdRange(start = "pollBgngYmd", end = "pollEndYmd")
public class OnlinePollManageRequest extends OnlinePollManageDto {
    @Override
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    public String getPollBgngYmd() {
        return super.getPollBgngYmd();
    }

    @Override
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    public String getPollEndYmd() {
        return super.getPollEndYmd();
    }
}
