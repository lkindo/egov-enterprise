package com.company.project.domain.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "NMENUINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Menu {

    @Id
    @Column(name = "MENU_NO")
    private Long id;

    @Column(name = "MENU_NM", nullable = false, length = 60)
    private String menuNm;

    @Column(name = "PROGRM_FILE_NM", length = 60)
    private String progrmFileNm;

    @Column(name = "UPPER_MENU_NO")
    private Long upperMenuNo;

    @Column(name = "MENU_ORDR", nullable = false)
    private Integer menuOrdr;

    @Column(name = "MENU_DC", length = 250)
    private String menuDc;

    @Column(name = "RELATE_IMAGE_PATH", length = 100)
    private String relateImagePath;

    @Column(name = "RELATE_IMAGE_NM", length = 100)
    private String relateImageNm;

    @Builder
    public Menu(Long id, String menuNm, String progrmFileNm, Long upperMenuNo, Integer menuOrdr, String menuDc,
            String relateImagePath, String relateImageNm) {
        this.id = id;
        this.menuNm = menuNm;
        this.progrmFileNm = progrmFileNm;
        this.upperMenuNo = upperMenuNo;
        this.menuOrdr = menuOrdr;
        this.menuDc = menuDc;
        this.relateImagePath = relateImagePath;
        this.relateImageNm = relateImageNm;
    }

    public void update(String menuNm, String progrmFileNm, Long upperMenuNo, Integer menuOrdr, String menuDc,
            String relateImagePath, String relateImageNm) {
        this.menuNm = menuNm;
        this.progrmFileNm = progrmFileNm;
        this.upperMenuNo = upperMenuNo;
        this.menuOrdr = menuOrdr;
        this.menuDc = menuDc;
        this.relateImagePath = relateImagePath;
        this.relateImageNm = relateImageNm;
    }
}
