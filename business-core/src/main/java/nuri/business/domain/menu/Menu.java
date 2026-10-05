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

    // [2026-10-05] 레거시 연결 프로그램 컬럼(prgrm_file_nm)은 V2_127 이 외래 키·프로그램 원장과 함께 지웠다(DEC-OPS-231).

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

    @Column(length = 300)
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
    private Menu(Long menuSn, String menuNm, Long upMenuSn, Integer menuOrdr,
                 String menuExpln, String relImgPath, String relImgNm, String modernRoute, String useYn) {
        this.menuSn = menuSn;
        this.menuNm = menuNm;
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
    public static Menu create(Long menuSn, String menuNm, Long upMenuSn, Integer menuOrdr,
                              String menuExpln, String relImgPath, String relImgNm, String modernRoute, String useYn) {
        return new Menu(menuSn, menuNm, upMenuSn, menuOrdr, menuExpln, relImgPath, relImgNm,
                modernRoute, useYn);
    }

    /**
     * 메뉴 정보 수정 (null-safe 병합).
     * <p>
     * 병합 규칙 — 부분(partial) 페이로드로 인한 무음 데이터 소실을 막기 위한 것이다.
     * <ul>
     *   <li>{@code upMenuSn} : 전달값을 그대로 반영한다. null 자체가 "루트로 이동"이라는 유효한 의미를 갖기 때문이다.</li>
     *   <li>그 외 값 필드 : null 이면 <b>기존 값을 유지</b>한다. 값을 비우려면 null 이 아니라 빈 문자열을 전달한다.
     *       (화면에 노출되지 않는 menuExpln/relImgPath/relImgNm 이 수정 1회로 조용히 null 이 되던 문제 차단)</li>
     * </ul>
     */
    public void update(String menuNm, Long upMenuSn, Integer menuOrdr, String menuExpln,
                       String relImgPath, String relImgNm, String useYn) {
        this.upMenuSn = upMenuSn;
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
     * [2026-10-02] 메뉴 구조 저장의 속성 치환 — 이름·연결 라우트·설명·사용 여부 네 필드만 통째로 바꾼다.
     * <p>{@link #update}·{@link #updateWithModernRoute} 를 쓰지 않는 이유: 그 둘은 상위 메뉴를 null 이어도 덮어쓰고(루트로
     * 이동), 서비스가 사용 여부 null 을 'Y' 로 바꿔 넘겨 비활성 메뉴가 다시 켜진다. 여기서는 위치·순서를 건드리지 않는다.
     * <p>빈 연결 라우트(null·'')는 라우트 없음이다. 라우트가 있던 메뉴를 비우면 빈 문자열로 저장한다 — null 은 "아직 채우지
     * 않은 경로" 라서, V2_126 이전 앱(기동 때 레거시 파일명으로 경로를 다시 채웠다)이 함께 떠 있는 동안 비움이 되돌아갈 수
     * 있다(단건 수정 경로도 빈 문자열을 저장한다). 이미 비어 있으면(null·'') 그대로 두어 저장만으로 값이 바뀌지 않게 한다.
     */
    public void replaceProperties(String menuNm, String modernRoute, String menuExpln, String useYn) {
        this.menuNm = menuNm;
        if (modernRoute != null && !modernRoute.isBlank()) {
            this.modernRoute = modernRoute;
        } else if (this.modernRoute != null && !this.modernRoute.isBlank()) {
            this.modernRoute = "";
        }
        this.menuExpln = menuExpln;
        this.useYn = useYn;
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
    public void updateWithModernRoute(String menuNm, Long upMenuSn, Integer menuOrdr,
                                       String menuExpln, String relImgPath, String relImgNm, String modernRoute, String useYn) {
        this.update(menuNm, upMenuSn, menuOrdr, menuExpln, relImgPath, relImgNm, useYn);
        if (modernRoute != null) {
            this.modernRoute = modernRoute;
        }
    }
}
