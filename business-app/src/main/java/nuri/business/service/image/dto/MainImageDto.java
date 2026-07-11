package nuri.business.service.image.dto;

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
@Schema(description = "메인 이미지 DTO")
public class MainImageDto {

    @NotBlank
    @Size(max = 20)
    @Schema(description = "이미지 ID")
    private String imgId;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "이미지 명")
    private String imgNm;

    @Size(max = 50)
    @Schema(description = "이미지 경로")
    private String mainImgFilePath;

    @Size(max = 100)
    @Schema(description = "이미지 파일명")
    private String imgFileNm;

    @Size(max = 4000)
    @Schema(description = "이미지 설명")
    private String mainImgExpln;

    @Size(max = 1)
    @Schema(description = "반영 여부")
    private String rfltYn;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;
}
