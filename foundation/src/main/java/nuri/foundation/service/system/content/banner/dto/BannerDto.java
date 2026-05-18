package nuri.foundation.service.system.content.banner.dto;

import nuri.foundation.domain.system.content.banner.Banner;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "배너 정보")
public class BannerDto {
    @Schema(description = "배너 ID")
    private String bannerId;
    @Schema(description = "배너 명칭")
    private String bannerNm;
    @Schema(description = "링크 URL")
    private String linkUrl;
    @Schema(description = "배너 이미지 경로")
    private String bannerImage;
    @Schema(description = "배너 설명")
    private String bannerDc;
    @Schema(description = "정렬 순서")
    private Integer sortOrdr;
    @Schema(description = "반영 여부")
    private String reflctAt;
    @Schema(description = "배너 이미지 파일 ID")
    private String bannerImageFile;
    @Schema(description = "생성자 ID")
    private String createdBy;
    @Schema(description = "생성 일시")
    private LocalDateTime createdDate;

    @JsonIgnore
    public String getBnrId() { return bannerId; }
    @JsonIgnore
    public String getBnrNm() { return bannerNm; }
    @JsonIgnore
    public String getBnrImgNm() { return bannerImage; }
    @JsonIgnore
    public String getBnrExpln() { return bannerDc; }

    public static BannerDto from(Banner entity) {
        if (entity == null) return null;
        return BannerDto.builder()
                .bannerId(entity.getBannerId())
                .bannerNm(entity.getBannerNm())
                .linkUrl(entity.getLinkUrl())
                .bannerImage(entity.getBannerImage())
                .bannerDc(entity.getBannerDc())
                .sortOrdr(entity.getSortOrdr())
                .reflctAt(entity.getReflctAt())
                .bannerImageFile(entity.getBannerImageFile())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
