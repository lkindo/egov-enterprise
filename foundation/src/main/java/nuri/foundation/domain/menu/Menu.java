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
    @Column(name = "MENU_SN")
    private Long id;

    @Column(name = "MENU_NM", nullable = false, length = 60)
    private String menuNm;

    @Column(name = "PRGRM_FILE_NM", length = 60)
    private String progrmFileNm;

    @Column(name = "UP_MENU_SN")
    private Long upperMenuSn;

    @Column(name = "MENU_ORDR", nullable = false)
    private Integer menuOrdr;

    @Column(name = "MENU_EXPLN", length = 250)
    private String menuExpln;

    @Column(name = "REL_IMG_PATH", length = 100)
    private String relateImagePath;

    @Column(name = "REL_IMG_NM", length = 60)
    private String relateImageNm;

    /**
     * 현대적 Next.js 라우트 (예: /admin/system/menus)
     */
    @Column(name = "MODERN_ROUTE", length = 500)
    private String modernRoute;

    @Column(name = "ROUTE_MDFCN_YN", length = 1)
    private String routeMdfcnYn;

    /**
     * 메뉴 정보 수정
     */
    public void update(String menuNm, String progrmFileNm, Long upperMenuSn, Integer menuOrdr, String menuExpln,
                       String relateImagePath, String relateImageNm) {
        this.menuNm = menuNm;
        this.progrmFileNm = progrmFileNm;
        this.upperMenuSn = upperMenuSn;
        this.menuOrdr = menuOrdr;
        this.menuExpln = menuExpln;
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
    public void updateWithModernRoute(String menuNm, String progrmFileNm, Long upperMenuSn, Integer menuOrdr,
                                       String menuExpln, String relateImagePath, String relateImageNm, String modernRoute) {
        this.update(menuNm, progrmFileNm, upperMenuSn, menuOrdr, menuExpln, relateImagePath, relateImageNm);
        this.modernRoute = modernRoute;
    }
}
