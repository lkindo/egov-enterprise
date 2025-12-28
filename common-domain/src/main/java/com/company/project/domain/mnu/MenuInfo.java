package com.company.project.domain.mnu;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "NMENUINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MenuInfo implements Serializable {

    @Id
    @Column(name = "MENU_NO", precision = 20)
    private Long menuNo;

    @Column(name = "MENU_NM", nullable = false, length = 60)
    private String menuNm;

    @Column(name = "MENU_ORDR", precision = 5)
    private Integer menuOrdr;

    @Column(name = "UPPER_MENU_NO", precision = 20)
    private Long upperMenuNo;

    @Column(name = "MENU_DC", length = 250)
    private String menuDc;

    @Column(name = "RELATE_IMAGE_PATH", length = 100)
    private String relateImagePath;

    @Column(name = "RELATE_IMAGE_NM", length = 60)
    private String relateImageNm;

    @Column(name = "PROGRM_FILE_NM", length = 60)
    private String progrmFileNm;

    public void update(String menuNm, Integer menuOrdr, Long upperMenuNo, String menuDc,
            String relateImagePath, String relateImageNm, String progrmFileNm) {
        this.menuNm = menuNm;
        this.menuOrdr = menuOrdr;
        this.upperMenuNo = upperMenuNo;
        this.menuDc = menuDc;
        this.relateImagePath = relateImagePath;
        this.relateImageNm = relateImageNm;
        this.progrmFileNm = progrmFileNm;
    }
}
