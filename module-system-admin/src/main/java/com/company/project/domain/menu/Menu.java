package com.company.project.domain.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

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

    /**
     * 현대적 Next.js 라우트 (예: /admin/system/menus)
     * JSP 에서 React 전환 후 사용되는 실제 라우트
     */
    @Column(name = "MODERN_ROUTE", length = 500)
    private String modernRoute;

    @UpdateTimestamp
    @Column(name = "ROUTE_UPDATED_AT")
    private LocalDateTime routeUpdatedAt;

    @Builder
    public Menu(Long id, String menuNm, String progrmFileNm, Long upperMenuNo, Integer menuOrdr, String menuDc,
                String relateImagePath, String relateImageNm, String modernRoute) {
        this.id = id;
        this.menuNm = menuNm;
        this.progrmFileNm = progrmFileNm;
        this.upperMenuNo = upperMenuNo;
        this.menuOrdr = menuOrdr;
        this.menuDc = menuDc;
        this.relateImagePath = relateImagePath;
        this.relateImageNm = relateImageNm;
        this.modernRoute = modernRoute;
    }

    /**
     * 메뉴 정보 수정 (기존 메서드)
     */
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

    /**
     * 현대적 라우트 업데이트
     */
    public void updateModernRoute(String modernRoute) {
        this.modernRoute = modernRoute;
        // routeUpdatedAt 는 @UpdateTimestamp 에 의해 자동 업데이트됨
    }

    /**
     * 메뉴 정보 수정 (modern_route 포함)
     */
    public void updateWithModernRoute(String menuNm, String progrmFileNm, Long upperMenuNo, Integer menuOrdr,
                                       String menuDc, String relateImagePath, String relateImageNm, String modernRoute) {
        this.menuNm = menuNm;
        this.progrmFileNm = progrmFileNm;
        this.upperMenuNo = upperMenuNo;
        this.menuOrdr = menuOrdr;
        this.menuDc = menuDc;
        this.relateImagePath = relateImagePath;
        this.relateImageNm = relateImageNm;
        this.modernRoute = modernRoute;
    }
}
