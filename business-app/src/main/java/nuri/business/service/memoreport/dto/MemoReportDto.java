package nuri.business.service.memoreport.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
@Schema(description = "메모보고 정보")
public class MemoReportDto {

    @Schema(description = "메모보고일련번호", nullable = true, types = {"integer", "null"},
            format = "int64", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long memoRptSn;

    @Schema(description = "보고제목")
    @NotBlank
    @Size(max = 100)
    private String rptTtl;

    @Schema(description = "보고일자")
    @Size(max = 8)
    private String memoRptYmd;

    @Schema(description = "작성자아이디", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String userId;

    @Schema(description = "작성자명", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Size(max = 100)
    private String wrterNm;

    @Schema(description = "보고대상자아이디")
    @NotBlank
    @Size(max = 20)
    private String rptrId;

    @Schema(description = "보고대상자명", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String rptrNm;

    @Schema(description = "보고내용")
    @Size(max = 4000)
    private String rptCn;

    @Schema(description = "첨부파일아이디")
    private Long atchFileSn;

    @Schema(description = "지시사항내용", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String drctnMttr;

    @Schema(description = "지시사항등록일시", nullable = true, types = {"string", "null"},
            format = "date-time", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime drctnMttrRegDt;

    @Schema(description = "보고대상자조회일시", nullable = true, types = {"string", "null"},
            format = "date-time", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime rptrInqDt;

    @Schema(description = "생성일시", nullable = true, types = {"string", "null"},
            format = "date-time", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime crtDt;

    // 수기 from(MemoReport) 은 MemoReportMapper(MapStruct, 프레임워크 표준)로 대체됨.
}
