package nuri.foundation.domain.menu;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * 메뉴 정보 엔티티 (NMENUINFO)
 * [Audit] BaseEntity 상속을 통해 일관된 감사 필드 제공 (PrePersist 제거 및 표준화)
 */
@Entity
@Table(name = "TB_MENU_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Menu extends BaseEntity {

    @Id
    @Column(name = "MENU_NO")
    private Long id;

    @Column(name = "MENU_NM", nullable = false, length = 60)
    private String menuNm;

    @Column(name = "PROGRM_FILE_NM", length = 60)
    private String progrmFileNm;

    @Column(name = "UP_MENU_NO")
    private Long upperMenuNo;

    @Column(name = "MENU_ORDR", nullable = false)
    private Integer menuOrdr;

    @Column(name = "MENU_DC", length = 250)
    private String menuDc;

    @Column(name = "RELATE_IMAGE_PATH", length = 100)
    private String relateImagePath;

    @Column(name = "RELATE_IMAGE_NM", length = 60) // Sync: 100 -> 60
    private String relateImageNm;

    /**
     * 현대적 Next.js 라우트 (예: /admin/system/menus)
     */
    @Column(name = "MODERN_ROUTE", length = 500)
    private String modernRoute;

    @UpdateTimestamp
    @Column(name = "ROUTE_UPDATED_YN")
    private LocalDateTime routeUpdatedAt;

    /**
     * 메뉴 정보 수정
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
    }

    /**
     * 메뉴 정보 수정 (modern_route 포함)
     */
    public void updateWithModernRoute(String menuNm, String progrmFileNm, Long upperMenuNo, Integer menuOrdr,
                                       String menuDc, String relateImagePath, String relateImageNm, String modernRoute) {
        this.update(menuNm, progrmFileNm, upperMenuNo, menuOrdr, menuDc, relateImagePath, relateImageNm);
        this.modernRoute = modernRoute;
    }
}
