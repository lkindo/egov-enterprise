package nuri.business.service.system.content.banner.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.content.banner.Banner;
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
    @Schema(description = "배너 ID")
    @Size(max = 20)
    private String bnrId;

    @Schema(description = "배너 명칭")
    @Size(max = 100)
    @NotBlank
    private String bnrNm;

    @Schema(description = "링크 URL")
    @Size(max = 1000)
    private String linkUrl;

    @Schema(description = "배너 이미지 경로")
    @Size(max = 100)
    private String bnrImgNm;

    @Schema(description = "배너 설명")
    @Size(max = 4000)
    private String bnrExpln;

    @Schema(description = "정렬 순서")
    private Integer sortOrdr;

    @Schema(description = "반영 여부")
    @Size(max = 1)
    private String rfltYn;

    @Schema(description = "배너 이미지 파일 ID")
    @Size(max = 30)
    private String atchFileId;

    @Schema(description = "생성자 ID")
    private String createdBy;
    @Schema(description = "생성 일시")
    private LocalDateTime createdDate;

    public static BannerDto from(Banner entity) {
        if (entity == null) return null;
        return BannerDto.builder()
                .bnrId(entity.getBnrId())
                .bnrNm(entity.getBnrNm())
                .linkUrl(entity.getLinkUrl())
                .bnrImgNm(entity.getBnrImgNm())
                .bnrExpln(entity.getBnrExpln())
                .sortOrdr(entity.getSortOrdr())
                .rfltYn(entity.getRfltYn())
                .atchFileId(entity.getAtchFileId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
