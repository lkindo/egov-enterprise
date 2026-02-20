package com.company.project.service.menu.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class MenuDto {

    @Schema(description = "Description")
    private Long id;

    @Schema(description = "Description")
    private Long menuNo;

    @Schema(description = "Description")
    private String menuNm;

    @Schema(description = "Description")
    private String progrmFileNm;

    @Schema(description = "Description")
    private Long upperMenuNo;

    @Schema(description = "Description")
    private Long upperMenuId;

    @Schema(description = "Description")
    private Integer menuOrdr;

    @Schema(description = "Description")
    private String chkURL;

    @Schema(description = "Description")
    private String menuDc;

    @Schema(description = "Description")
    private String relateImagePath;

    @Schema(description = "Description")
    private String relateImageNm;

    @Schema(description = "Description")
    private String creatPersonId;

    @Builder.Default
    @Schema(description = "Description")
    private List<MenuDto> children = new ArrayList<>();

    public void addChild(MenuDto child) {
        this.children.add(child);
    }
}
