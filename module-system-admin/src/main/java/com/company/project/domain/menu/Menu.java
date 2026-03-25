package com.company.project.domain.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
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

    // NMENUINFO 테이블의 NOT NULL 감사 필드 대응
    @Column(name = "FRST_REGISTER_ID", updatable = false, length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @jakarta.persistence.PrePersist
    protected void onPrePersist() {
        if (this.frstRegisterId == null) {
            this.frstRegisterId = "webmaster"; // 기본 관리자 계정('webmaster') 할당
        }
        if (this.frstRegistPnttm == null) {
            this.frstRegistPnttm = LocalDateTime.now();
        }
        if (this.lastUpdusrId == null) {
            this.lastUpdusrId = "webmaster";
        }
        if (this.lastUpdtPnttm == null) {
            this.lastUpdtPnttm = LocalDateTime.now();
        }
    }

    @jakarta.persistence.PreUpdate
    protected void onPreUpdate() {
        if (this.lastUpdusrId == null) {
            this.lastUpdusrId = "admin";
        }
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    @Builder
    public Menu(Long id, String menuNm, String progrmFileNm, Long upperMenuNo, Integer menuOrdr, String menuDc,
                String relateImagePath, String relateImageNm, String modernRoute,
                String frstRegisterId, java.time.LocalDateTime frstRegistPnttm,
                String lastUpdusrId, java.time.LocalDateTime lastUpdtPnttm) {
        this.id = id;
        this.menuNm = menuNm;
        this.progrmFileNm = progrmFileNm;
        this.upperMenuNo = upperMenuNo;
        this.menuOrdr = menuOrdr;
        this.menuDc = menuDc;
        this.relateImagePath = relateImagePath;
        this.relateImageNm = relateImageNm;
        this.modernRoute = modernRoute;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = frstRegistPnttm;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = lastUpdtPnttm;
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
