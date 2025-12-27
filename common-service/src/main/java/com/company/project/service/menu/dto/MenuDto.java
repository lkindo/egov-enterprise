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
@Schema(description = "메뉴 정보")
public class MenuDto {

    @Schema(description = "메뉴 번호", example = "1000000")
    private Long id;

    @Schema(description = "메뉴 번호 (Legacy 호환)", example = "1000000")
    private Long menuNo;

    @Schema(description = "메뉴 명", example = "알림정보")
    private String menuNm;

    @Schema(description = "프로그램 파일 명", example = "dir")
    private String progrmFileNm;

    @Schema(description = "상위 메뉴 번호", example = "0")
    private Long upperMenuNo;

    @Schema(description = "상위 메뉴 번호 (Legacy 호환)", example = "0")
    private Long upperMenuId;

    @Schema(description = "메뉴 순서", example = "1")
    private Integer menuOrdr;

    @Schema(description = "메뉴 실행 URL", example = "/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA")
    private String chkURL;

    @Schema(description = "메뉴 설명", example = "메뉴 상세 설명")
    private String menuDc;

    @Schema(description = "관련 이미지 경로", example = "/")
    private String relateImagePath;

    @Schema(description = "관련 이미지 명", example = "/")
    private String relateImageNm;

    @Schema(description = "생성자 ID", example = "admin")
    private String creatPersonId;

    @Builder.Default
    @Schema(description = "하위 메뉴 목록")
    private List<MenuDto> children = new ArrayList<>();

    public void addChild(MenuDto child) {
        this.children.add(child);
    }
}
