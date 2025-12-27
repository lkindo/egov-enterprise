package com.company.project.service.menu.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
@Schema(description = "메뉴 정보")
public class MenuDto {

    @Schema(description = "메뉴 번호", example = "1000000")
    private final Long id;

    @Schema(description = "메뉴 번호 (Legacy 호환)", example = "1000000")
    private final Long menuNo;

    @Schema(description = "메뉴 명", example = "알림정보")
    private final String menuNm;

    @Schema(description = "프로그램 파일 명", example = "dir")
    private final String progrmFileNm;

    @Schema(description = "상위 메뉴 번호", example = "0")
    private final Long upperMenuNo;

    @Schema(description = "상위 메뉴 번호 (Legacy 호환)", example = "0")
    private final Long upperMenuId;

    @Schema(description = "메뉴 순서", example = "1")
    private final Integer menuOrdr;

    @Schema(description = "메뉴 실행 URL", example = "/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA")
    private final String chkURL;

    @Schema(description = "관련 이미지 경로", example = "/")
    private final String relateImagePath;

    @Schema(description = "관련 이미지 명", example = "/")
    private final String relateImageNm;

    @Builder.Default
    @Schema(description = "하위 메뉴 목록")
    private final List<MenuDto> children = new ArrayList<>();

    public void addChild(MenuDto child) {
        this.children.add(child);
    }
}
