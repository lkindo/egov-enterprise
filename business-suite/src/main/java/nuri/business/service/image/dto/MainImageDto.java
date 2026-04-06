package nuri.business.service.image.dto;

import nuri.business.domain.image.MainImage;
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
@Schema(description = "Description")
public class MainImageDto {

    @Schema(description = "Description")
    private String imageId;

    @Schema(description = "Description")
    private String imageNm;

    @Schema(description = "Description")
    private String image;

    @Schema(description = "Description")
    private String imageFile;

    @Schema(description = "Description")
    private String imageDc;

    @Schema(description = "Description")
    private String reflctAt;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static MainImageDto from(MainImage entity) {
        if (entity == null) return null;
        return MainImageDto.builder()
                .imageId(entity.getImageId())
                .imageNm(entity.getImageNm())
                .image(entity.getImage())
                .imageFile(entity.getImageFile())
                .imageDc(entity.getImageDc())
                .reflctAt(entity.getReflctAt())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
