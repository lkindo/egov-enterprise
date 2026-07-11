package nuri.business.service.schedule.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "간부 상태 정보 DTO")
public class LeaderStatusDto {

    @Schema(description = "간부아이디")
    @Size(max = 20)
    private String leaderId;

    @Schema(description = "간부명")
    private String leaderNm;

    @Schema(description = "조직명")
    private String orgnztNm;

    @Schema(description = "간부상태코드")
    @Size(max = 12)
    private String leaderSttsCd;

    @Schema(description = "간부상태명")
    private String leaderSttusNm;

    @Schema(description = "등록일시")
    private LocalDateTime crtDt;

    // 엔티티→DTO 변환은 프레임워크 표준 MapStruct 매퍼 {@link LeaderStatusMapper} 로 이관되었다.
}
