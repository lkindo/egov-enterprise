package nuri.business.domain.menu;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;

/**
 * 메뉴 정보 엔티티 (NMENUINFO)
 * [Audit] BaseEntity 상속을 통해 일관된 감사 필드 제공 (PrePersist 제거 및 표준화)
 */
@Entity
@Table(name = "tb_menu_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Menu extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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

    @Column(length = 1)
    private String useYn = "Y";

    /**
     * 영속 엔티티 생성용 private 생성자.
     * 팩토리(create)에서만 위임 호출한다.
     * (@Builder.Default 재현: useYn 은 null 병합으로 기본값 "Y" 유지, children 은 필드 초기화로 빈 리스트 유지)
     */
    private Menu(Long menuSn, String menuNm, String prgrmFileNm, Long upMenuSn, Integer menuOrdr,
                 String menuExpln, String relImgPath, String relImgNm, String modernRoute, String useYn) {
        this.menuSn = menuSn;
        this.menuNm = menuNm;
        this.prgrmFileNm = prgrmFileNm;
        this.upMenuSn = upMenuSn;
        this.menuOrdr = menuOrdr;
        this.menuExpln = menuExpln;
        this.relImgPath = relImgPath;
        this.relImgNm = relImgNm;
        this.modernRoute = modernRoute;
        // @Builder.Default 널병합 재현 (기본값 "Y")
        this.useYn = useYn != null ? useYn : "Y";
    }

    /**
     * 메뉴 엔티티 생성 정적 팩토리.
     * 기존 Menu.builder()...build() 호출부와 동일하게 동작한다.
     */
    @Builder
    public static Menu create(Long menuSn, String menuNm, String prgrmFileNm, Long upMenuSn, Integer menuOrdr,
                              String menuExpln, String relImgPath, String relImgNm, String modernRoute, String useYn) {
        return new Menu(menuSn, menuNm, prgrmFileNm, upMenuSn, menuOrdr, menuExpln, relImgPath, relImgNm,
                modernRoute, useYn);
    }

    /**
     * 메뉴 정보 수정 (null-safe 병합).
     * <p>
     * 병합 규칙 — 부분(partial) 페이로드로 인한 무음 데이터 소실을 막기 위한 것이다.
     * <ul>
     *   <li>{@code upMenuSn}, {@code prgrmFileNm} : 전달값을 그대로 반영한다.
     *       null 자체가 "루트로 이동" / "연결 프로그램 없음"이라는 유효한 의미를 갖기 때문이다.</li>
     *   <li>그 외 값 필드 : null 이면 <b>기존 값을 유지</b>한다. 값을 비우려면 null 이 아니라 빈 문자열을 전달한다.
     *       (화면에 노출되지 않는 menuExpln/relImgPath/relImgNm 이 수정 1회로 조용히 null 이 되던 문제 차단)</li>
     * </ul>
     */
    public void update(String menuNm, String prgrmFileNm, Long upMenuSn, Integer menuOrdr, String menuExpln,
                       String relImgPath, String relImgNm, String useYn) {
        this.upMenuSn = upMenuSn;
        this.prgrmFileNm = prgrmFileNm;
        if (menuNm != null) {
            this.menuNm = menuNm;
        }
        if (menuOrdr != null) {
            this.menuOrdr = menuOrdr;
        }
        if (menuExpln != null) {
            this.menuExpln = menuExpln;
        }
        if (relImgPath != null) {
            this.relImgPath = relImgPath;
        }
        if (relImgNm != null) {
            this.relImgNm = relImgNm;
        }
        if (useYn != null) {
            this.useYn = useYn;
        }
    }

    /**
     * 순서/계층 전용 수정.
     * <p>
     * 트리 일괄 정렬 저장(batch-order)이 설명·아이콘 등 다른 컬럼을 함께 덮어쓰지 않도록 분리한 메서드다.
     * upMenuSn 은 null(=루트)도 유효한 값이므로 그대로 반영하고, menuOrdr 은 NOT NULL 컬럼이라 null 이면 무시한다.
     */
    public void updateOrder(Long upMenuSn, Integer menuOrdr) {
        this.upMenuSn = upMenuSn;
        if (menuOrdr != null) {
            this.menuOrdr = menuOrdr;
        }
    }

    /**
     * 현대적 라우트 업데이트
     */
    public void updateModernRoute(String modernRoute) {
        this.modernRoute = modernRoute;
    }

    /**
     * 메뉴 정보 수정 (modern_route 포함).
     * modernRoute 역시 {@link #update} 와 동일한 병합 규칙(null=유지, 빈 문자열=비움)을 따른다.
     */
    public void updateWithModernRoute(String menuNm, String prgrmFileNm, Long upMenuSn, Integer menuOrdr,
                                       String menuExpln, String relImgPath, String relImgNm, String modernRoute, String useYn) {
        this.update(menuNm, prgrmFileNm, upMenuSn, menuOrdr, menuExpln, relImgPath, relImgNm, useYn);
        if (modernRoute != null) {
            this.modernRoute = modernRoute;
        }
    }
}
