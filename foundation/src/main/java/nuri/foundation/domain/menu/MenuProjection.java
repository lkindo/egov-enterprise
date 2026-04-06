package nuri.foundation.domain.menu;

import lombok.*;
import lombok.Builder;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MenuProjection {
    private Long menuNo;
    private Integer menuOrdr;
    private String menuNm;
    private Long upperMenuId;
    private String menuDc;
    private String relateImagePath;
    private String relateImageNm;
    private String progrmFileNm;
    private String chkURL;
}
