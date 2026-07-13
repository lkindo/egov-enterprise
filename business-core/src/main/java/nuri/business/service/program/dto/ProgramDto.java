package nuri.business.service.program.dto;

import jakarta.validation.constraints.*;

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
    @Size(max = 100)
    private String prgrmFileNm;

    @Schema(description = "프로그램 저장 경로")
    @Size(max = 1000)
    private String prgrmStrgPath;

    @Schema(description = "프로그램 한글 명칭")
    @Size(max = 100)
    private String prgrmKornNm;

    @Schema(description = "프로그램 URL")
    @Size(max = 1000)
    private String url;

    @Schema(description = "프로그램 설명")
    @Size(max = 4000)
    private String prgrmExpln;

    // 수기 from() 은 ProgramMapper(componentModel=spring)로 완전 대체되어 제거됨.
    // 유일 호출자였던 MenuService.getAllPrograms() 도 programMapper::toDto 로 전환.
}
