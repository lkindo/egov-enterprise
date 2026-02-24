package com.company.project.service.menu.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "메뉴 정보 DTO")
public class MenuDto {
    @Schema(description = "ID")
    private Long id;

    @Schema(description = "메뉴 번호")
    private Long menuNo;

    @Schema(description = "메뉴 명")
    private String menuNm;

    @Schema(description = "프로그램 파일 명")
    private String progrmFileNm;

    @Schema(description = "상위 메뉴 번호")
    private Long upperMenuNo;

    @Schema(description = "상위 메뉴 ID")
    private Long upperMenuId;

    @Schema(description = "메뉴 순서")
    private Integer menuOrdr;

    @Schema(description = "URL 체크")
    private String chkURL;

    @Schema(description = "메뉴 설명")
    private String menuDc;

    @Schema(description = "관련 이미지 경로")
    private String relateImagePath;

    @Schema(description = "관련 이미지 명")
    private String relateImageNm;

    @Schema(description = "생성자 ID")
    private String creatPersonId;

    @Builder.Default
    @Schema(description = "자식 메뉴 목록")
    private List<MenuDto> children = new ArrayList<>();

    public void addChild(MenuDto child) {
        this.children.add(child);
    }
}
