package nuri.business.domain.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MenuRepository extends JpaRepository<Menu, Long>, MenuRepositoryCustom {
    interface ParentLink {
        Long getMenuSn();
        Long getUpMenuSn();
    }

    /** 권한 관리와 같은 메뉴 번호 순서로 잠근다. 자기 FK의 KEY SHARE와는 충돌하지 않는다. */
    @Query(value = """
            SELECT menu_sn AS "menuSn", up_menu_sn AS "upMenuSn"
            FROM tb_menu_info ORDER BY menu_sn FOR NO KEY UPDATE
            """, nativeQuery = true)
    List<ParentLink> findParentLinksForUpdate();

    /** [2026-10-02] 메뉴 구조 편집기가 읽는 한 행. 구조 버전은 이 여덟 칸의 요약값이다. */
    interface StructureRow {
        Long getMenuSn();
        Long getUpMenuSn();
        Integer getMenuOrdr();
        String getMenuNm();
        String getUseYn();
        String getModernRoute();
        String getMenuExpln();
        String getPrgrmFileNm();
    }

    /**
     * 메뉴 구조를 캐시를 거치지 않고 DB 에서 읽는다 — 메뉴 목록 캐시는 인스턴스마다 따로 10분이라 그 값으로 버전을 만들면
     * 다른 인스턴스에서 저장할 때 409 가 되풀이된다.
     */
    @Query(value = """
            SELECT menu_sn AS "menuSn", up_menu_sn AS "upMenuSn", menu_ordr AS "menuOrdr", menu_nm AS "menuNm",
                   use_yn AS "useYn", modern_route AS "modernRoute", menu_expln AS "menuExpln", prgrm_file_nm AS "prgrmFileNm"
            FROM tb_menu_info ORDER BY menu_sn
            """, nativeQuery = true)
    List<StructureRow> findStructureRows();

    /** 구조 저장이 잠그고 읽는다. 잠금 순서·방식은 {@link #findParentLinksForUpdate()} 와 같다(메뉴 → ADMIN). */
    @Query(value = """
            SELECT menu_sn AS "menuSn", up_menu_sn AS "upMenuSn", menu_ordr AS "menuOrdr", menu_nm AS "menuNm",
                   use_yn AS "useYn", modern_route AS "modernRoute", menu_expln AS "menuExpln", prgrm_file_nm AS "prgrmFileNm"
            FROM tb_menu_info ORDER BY menu_sn FOR NO KEY UPDATE
            """, nativeQuery = true)
    List<StructureRow> findStructureRowsForUpdate();

    List<Menu> findAllByOrderByUpMenuSnAscMenuOrdrAsc();

    List<Menu> findByUpMenuSnOrderByMenuOrdrAsc(Long upMenuSn);

    Optional<Menu> findFirstByUpMenuSnOrderByMenuOrdrAsc(Long upMenuSn);

    Optional<Menu> findByPrgrmFileNm(String prgrmFileNm);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM Menu m WHERE m.menuNm LIKE %:searchKeyword% OR m.prgrmFileNm LIKE %:searchKeyword%")
    org.springframework.data.domain.Page<Menu> searchByKeyword(
            @org.springframework.data.repository.query.Param("searchKeyword") String searchKeyword,
            org.springframework.data.domain.Pageable pageable);

    int countByUpMenuSn(Long upMenuSn);

    // [V2_13 결속] 일괄 삭제 시 "삭제 집합 밖의 자식" 존재 검사 (자기참조 FK 가드)
    int countByUpMenuSnAndMenuSnNotIn(Long upMenuSn, java.util.Collection<Long> menuSns);

    /**
     * modern_route 가 설정되지 않은 메뉴 조회
     */
    @Query("SELECT m FROM Menu m WHERE m.modernRoute IS NULL")
    List<Menu> findAllWithoutModernRoute();

    /** 시작 시 읽은 스냅샷으로 부모 등 다른 필드를 덮어쓰지 않고, 아직 같은 프로그램의 빈 경로만 보강한다. */
    @org.springframework.transaction.annotation.Transactional
    @Modifying
    @Query("""
            UPDATE Menu m SET m.modernRoute = :modernRoute,
                m.mdfcnDt = :modifiedAt, m.lastMdfrId = :modifiedBy
            WHERE m.menuSn = :menuId AND m.modernRoute IS NULL
              AND (m.prgrmFileNm = :expectedProgramFileNm
                OR (m.prgrmFileNm IS NULL AND :expectedProgramFileNm IS NULL))
            """)
    int fillModernRouteIfUnchanged(@Param("menuId") Long menuId,
            @Param("expectedProgramFileNm") String expectedProgramFileNm,
            @Param("modernRoute") String modernRoute,
            @Param("modifiedAt") java.time.LocalDateTime modifiedAt,
            @Param("modifiedBy") String modifiedBy);

    /**
     * modern_route 로 메뉴 조회
     */
    @Query("SELECT m FROM Menu m WHERE m.modernRoute = :modernRoute")
    Optional<Menu> findByModernRoute(@Param("modernRoute") String modernRoute);

    /**
     * modern_route 가 설정된 메뉴 수 조회
     */
    @Query("SELECT COUNT(m) FROM Menu m WHERE m.modernRoute IS NOT NULL")
    long countWithModernRoute();

    /**
     * modern_route 일괄 업데이트 (배치용)
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Menu m SET m.modernRoute = :modernRoute WHERE m.menuSn IN :menuIds")
    int bulkUpdateModernRoute(@Param("menuIds") List<Long> menuIds, @Param("modernRoute") String modernRoute);

    /**
     * prgrm_file_nm 패턴으로 modern_route 일괄 업데이트
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Menu m SET m.modernRoute = :modernRoute WHERE m.prgrmFileNm LIKE :pattern")
    int bulkUpdateModernRouteByPattern(@Param("pattern") String pattern, @Param("modernRoute") String modernRoute);

    /** 권한 변경 서비스와 동일하게 메뉴 번호 오름차순으로 삭제 대상 행을 잠근다. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Menu m WHERE m.menuSn IN :menuIds ORDER BY m.menuSn ASC")
    List<Menu> findForUpdateByMenuSnIn(@Param("menuIds") List<Long> menuIds);

    /**
     * [성능 최적화] 메뉴와 프로그램 정보를 한 번에 조회 (N+1 방지)
     */
    @Query("""
                SELECT new nuri.business.service.menu.dto.MenuWithProgramDto(m, p)
                FROM Menu m
                LEFT JOIN Program p ON m.prgrmFileNm = p.prgrmFileNm
                ORDER BY m.upMenuSn ASC, m.menuOrdr ASC
            """)
    List<nuri.business.service.menu.dto.MenuWithProgramDto> findAllWithPrograms();
}

