package nuri.business.domain.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MenuRepository extends JpaRepository<Menu, Long> {
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

    /**
     * [2026-10-02] 메뉴 구조 편집기가 읽는 한 행. 구조 버전은 이 일곱 칸의 요약값이다.
     * [2026-10-05] 레거시 연결 프로그램(prgrm_file_nm)은 앱이 읽지 않으므로 뺐다(DEC-OPS-231).
     */
    interface StructureRow {
        Long getMenuSn();
        Long getUpMenuSn();
        Integer getMenuOrdr();
        String getMenuNm();
        String getUseYn();
        String getModernRoute();
        String getMenuExpln();
    }

    /**
     * 메뉴 구조를 캐시를 거치지 않고 DB 에서 읽는다 — 메뉴 목록 캐시는 인스턴스마다 따로 10분이라 그 값으로 버전을 만들면
     * 다른 인스턴스에서 저장할 때 409 가 되풀이된다.
     */
    @Query(value = """
            SELECT menu_sn AS "menuSn", up_menu_sn AS "upMenuSn", menu_ordr AS "menuOrdr", menu_nm AS "menuNm",
                   use_yn AS "useYn", modern_route AS "modernRoute", menu_expln AS "menuExpln"
            FROM tb_menu_info ORDER BY menu_sn
            """, nativeQuery = true)
    List<StructureRow> findStructureRows();

    /** 구조 저장이 잠그고 읽는다. 잠금 순서·방식은 {@link #findParentLinksForUpdate()} 와 같다(메뉴 → ADMIN). */
    @Query(value = """
            SELECT menu_sn AS "menuSn", up_menu_sn AS "upMenuSn", menu_ordr AS "menuOrdr", menu_nm AS "menuNm",
                   use_yn AS "useYn", modern_route AS "modernRoute", menu_expln AS "menuExpln"
            FROM tb_menu_info ORDER BY menu_sn FOR NO KEY UPDATE
            """, nativeQuery = true)
    List<StructureRow> findStructureRowsForUpdate();

    List<Menu> findAllByOrderByUpMenuSnAscMenuOrdrAsc();

    int countByUpMenuSn(Long upMenuSn);

    // [V2_13 결속] 일괄 삭제 시 "삭제 집합 밖의 자식" 존재 검사 (자기참조 FK 가드)
    int countByUpMenuSnAndMenuSnNotIn(Long upMenuSn, java.util.Collection<Long> menuSns);

    /** 권한 변경 서비스와 동일하게 메뉴 번호 오름차순으로 삭제 대상 행을 잠근다. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Menu m WHERE m.menuSn IN :menuIds ORDER BY m.menuSn ASC")
    List<Menu> findForUpdateByMenuSnIn(@Param("menuIds") List<Long> menuIds);
}

