package nuri.business.domain.menu;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

/**
 * 메뉴 정보 엔티티 (NMENUINFO)
 * [Audit] BaseEntity 상속을 통해 일관된 감사 필드 제공 (PrePersist 제거 및 표준화)
 */
@Entity
@Table(name = "tb_menu_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Menu extends BaseEntity {

    @Id
    @Column(name = "menu_sn")
    private Long menuSn;



    @Column(nullable = false, length = 100)
    private String menuNm;

    @Column(name = "prgrm_file_nm", length = 100)
    private String prgrmFileNm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prgrm_file_nm", referencedColumnName = "prgrm_file_nm", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.program.Program program;

    @Column(name = "up_menu_sn")
    private Long upMenuSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "up_menu_sn", referencedColumnName = "menu_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Menu parent;

    @Builder.Default
    @org.hibernate.annotations.BatchSize(size = 50)
    @jakarta.persistence.OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Menu> children = new java.util.ArrayList<>();

    @Column(nullable = false)
    private Integer menuOrdr;

    @Column(length = 4000)
    private String menuExpln;

    @Column(length = 100)
    private String relImgPath;

    @Column(length = 100)
    private String relImgNm;

    /**
     * 현대적 Next.js 라우트 (예: /admin/system/menus)
     */
    @Column(length = 500)
    private String modernRoute;

    @Column(length = 1)
    private String routeMdfcnYn;

    /**
     * 메뉴 정보 수정
     */
    public void update(String menuNm, String prgrmFileNm, Long upMenuSn, Integer menuOrdr, String menuExpln,
                       String relImgPath, String relImgNm) {
        this.menuNm = menuNm;
        this.prgrmFileNm = prgrmFileNm;
        this.upMenuSn = upMenuSn;
        this.menuOrdr = menuOrdr;
        this.menuExpln = menuExpln;
        this.relImgPath = relImgPath;
        this.relImgNm = relImgNm;
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
    public void updateWithModernRoute(String menuNm, String prgrmFileNm, Long upMenuSn, Integer menuOrdr,
                                       String menuExpln, String relImgPath, String relImgNm, String modernRoute) {
        this.update(menuNm, prgrmFileNm, upMenuSn, menuOrdr, menuExpln, relImgPath, relImgNm);
        this.modernRoute = modernRoute;
    }
}

