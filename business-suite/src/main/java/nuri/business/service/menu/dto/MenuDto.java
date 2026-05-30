package nuri.business.service.menu.dto;

import jakarta.validation.constraints.*;

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
@Schema(description = "메뉴 정보 DTO")
public class MenuDto {
    @Schema(description = "시스템 고유 ID", example = "1")
    private Long id;

    @Schema(description = "메뉴 번호", example = "1000000")
    private Long menuNo;

    @Schema(description = "메뉴 명칭", example = "시스템관리")
    @Size(max = 100)
    @NotBlank
    private String menuNm;

    @Schema(description = "프로그램 파일 명칭", example = "EgovMain")
    @Size(max = 100)
    private String prgrmFileNm;

    @Schema(description = "상위 메뉴 번호", example = "0")
    private Long upMenuSn;

    @Schema(description = "상위 메뉴 ID", example = "0")
    private Long upperMenuId;

    @Schema(description = "메뉴 순서", example = "1")
    @NotNull
    private Integer menuOrdr;

    @Schema(description = "URL 패턴", example = "/admin/**")
    private String chkURL;

    @Schema(description = "메뉴 설명", example = "시스템 전반을 관리하는 최상위 메뉴")
    @Size(max = 4000)
    private String menuExpln;

    @Schema(description = "관련 이미지 경로", example = "/images/menu/")
    @Size(max = 100)
    private String relImgPath;

    @Schema(description = "관련 이미지 명칭", example = "icon_system.png")
    @Size(max = 100)
    private String relImgNm;

    @Schema(description = "현대화된 라우트 경로 (Next.js)", example = "/admin/system")
    @Size(max = 500)
    private String modernRoute;

    @Schema(description = "생성자 ID", example = "admin")
    @Size(max = 20)
    private String crtrId;

    @Builder.Default
    @Schema(description = "하위 메뉴 목록")
    private List<MenuDto> children = new ArrayList<>();

    public void addChild(MenuDto child) {
        this.children.add(child);
    }
}


