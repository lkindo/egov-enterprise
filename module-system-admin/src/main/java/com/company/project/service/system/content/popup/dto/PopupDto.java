package com.company.project.service.system.content.popup.dto;

import com.company.project.domain.system.content.popup.Popup;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "팝업 정보")
public class PopupDto {
    @Schema(description = "팝업 ID")
    private String popupId;
    @Schema(description = "팝업 제목")
    private String popupTitleName;
    @Schema(description = "파일 URL")
    private String fileUrl;
    @Schema(description = "팝업 가로 위치")
    private String popupWidthLocation;
    @Schema(description = "팝업 세로 위치")
    private String popupHeightLocation;
    @Schema(description = "팝업 높이 크기")
    private String popupHeightSize;
    @Schema(description = "팝업 너비 크기")
    private String popupWidthSize;
    @Schema(description = "게시 시작일")
    private String noticeBeginDate;
    @Schema(description = "게시 종료일")
    private String noticeEndDate;
    @Schema(description = "그만보기 여부")
    private String isStopView;
    @Schema(description = "게시 여부")
    private String isNotice;
    @Schema(description = "생성자 ID")
    private String createdBy;
    @Schema(description = "생성 일시")
    private LocalDateTime createdDate;

    public static PopupDto from(Popup entity) {
        if (entity == null)
            return null;
        return PopupDto.builder()
                .popupId(entity.getPopupId())
                .popupTitleName(entity.getPopupTitleName())
                .fileUrl(entity.getFileUrl())
                .popupWidthLocation(entity.getPopupWidthLocation())
                .popupHeightLocation(entity.getPopupHeightLocation())
                .popupHeightSize(entity.getPopupHeightSize())
                .popupWidthSize(entity.getPopupWidthSize())
                .noticeBeginDate(entity.getNoticeBeginDate())
                .noticeEndDate(entity.getNoticeEndDate())
                .isStopView(entity.getIsStopView())
                .isNotice(entity.getIsNotice())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
