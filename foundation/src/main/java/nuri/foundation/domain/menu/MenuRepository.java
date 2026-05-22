package nuri.foundation.domain.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MenuRepository extends JpaRepository<Menu, Long>, MenuRepositoryCustom {
    List<Menu> findAllByOrderByUpMenuSnAscMenuOrdrAsc();

    List<Menu> findByUpMenuSnOrderByMenuOrdrAsc(Long upMenuSn);

    Optional<Menu> findFirstByUpMenuSnOrderByMenuOrdrAsc(Long upMenuSn);

    Optional<Menu> findByPrgrmFileNm(String prgrmFileNm);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM Menu m WHERE m.menuNm LIKE %:searchKeyword% OR m.prgrmFileNm LIKE %:searchKeyword%")
    org.springframework.data.domain.Page<Menu> searchByKeyword(
            @org.springframework.data.repository.query.Param("searchKeyword") String searchKeyword,
            org.springframework.data.domain.Pageable pageable);

    int countByUpMenuSn(Long upMenuSn);

    /**
     * modern_route 가 설정되지 않은 메뉴 조회
     */
    @Query("SELECT m FROM Menu m WHERE m.modernRoute IS NULL")
    List<Menu> findAllWithoutModernRoute();

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
    @Query("UPDATE Menu m SET m.modernRoute = :modernRoute WHERE m.id IN :menuIds")
    int bulkUpdateModernRoute(@Param("menuIds") List<Long> menuIds, @Param("modernRoute") String modernRoute);

    /**
     * prgrm_file_nm 패턴으로 modern_route 일괄 업데이트
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Menu m SET m.modernRoute = :modernRoute WHERE m.prgrmFileNm LIKE :pattern")
    int bulkUpdateModernRouteByPattern(@Param("pattern") String pattern, @Param("modernRoute") String modernRoute);

    /**
     * [성능 최적화] 메뉴와 권한 정보를 한 번에 조회 (N+1 방지)
     */
    @Query("""
                SELECT m, ma
                FROM Menu m
                LEFT JOIN MenuAuthority ma ON m.id = ma.id.menuSn
                ORDER BY m.upMenuSn ASC, m.menuOrdr ASC
            """)
    List<Object[]> findAllWithAuthorities();

    /**
     * [성능 최적화] 메뉴와 프로그램 정보를 한 번에 조회 (N+1 방지)
     */
    @Query("""
                SELECT m, p
                FROM Menu m
                LEFT JOIN Program p ON m.prgrmFileNm = p.prgrmFileNm
                ORDER BY m.upMenuSn ASC, m.menuOrdr ASC
            """)
    List<Object[]> findAllWithPrograms();
}

