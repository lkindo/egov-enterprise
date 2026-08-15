package nuri.business.service.system.content.banner.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "배너 정보")
public class BannerDto {
    @Schema(description = "배너 일련번호")
    private Long bnrSn;

    @Schema(description = "배너 명칭")
    @Size(max = 100)
    @NotBlank
    private String bnrNm;

    @Schema(description = "링크 URL")
    @Size(max = 512)
    private String linkUrl;

    @Schema(description = "배너 이미지 경로")
    @Size(max = 100)
    private String bnrImgNm;

    @Schema(description = "배너 설명")
    @Size(max = 4000)
    private String bnrExpln;

    @Schema(description = "정렬 순서")
    private Long sortOrdr;

    @Schema(description = "반영 여부", allowableValues = {"Y", "N"})
    @Size(max = 1)
    @Pattern(regexp = "^(?:Y|N)$")
    private String rfltYn;

    @Schema(description = "배너 이미지 첨부파일 일련번호")
    private Long atchFileSn;

    @Schema(description = "생성자 ID")
    private String frstRgtrId;
    @Schema(description = "생성 일시")
    private LocalDateTime crtDt;
}
