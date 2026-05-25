package nuri.foundation.service.program.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "프로그램 정보 DTO")
public class ProgramDto {
    @Schema(description = "프로그램 파일 명칭")
    private String prgrmFileNm;

    @Schema(description = "프로그램 저장 경로")
    private String prgrmStrgPath;

    @Schema(description = "프로그램 한글 명칭")
    private String prgrmKornNm;

    @Schema(description = "프로그램 URL")
    private String url;

    @Schema(description = "프로그램 설명")
    private String prgrmExpln;
}
