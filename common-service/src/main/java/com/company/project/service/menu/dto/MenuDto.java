package com.company.project.service.menu.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "메뉴 ?보 DTO")
public class MenuDto {
    @Schema(description = "ID")
    private Long id;

    @Schema(description = "메뉴 번호")
    private Long menuNo;

    @Schema(description = "메뉴 ?)")
    private String menuNm;

    @Schema(description = "?로그램 ?일 ?)")
    private String progrmFileNm;

    @Schema(description = "?위 메뉴 번호")
    private Long upperMenuNo;

    @Schema(description = "?위 메뉴 ID")
    private Long upperMenuId;

    @Schema(description = "메뉴 ?서")
    private Integer menuOrdr;

    @Schema(description = "URL 체크")
    private String chkURL;

    @Schema(description = "메뉴 ?명")
    private String menuDc;

    @Schema(description = "관????지 경로")
    private String relateImagePath;

    @Schema(description = "관????지 ?)")
    private String relateImageNm;

    @Schema(description = "?????우??(Next.js)")
    private String modernRoute;

    @Schema(description = "?성??ID")
    private String creatPersonId;

    @Builder.Default
    @Schema(description = "?식 메뉴 목록")
    private List<MenuDto> children = new ArrayList<>();

    public void addChild(MenuDto child) {
        this.children.add(child);
    }
}