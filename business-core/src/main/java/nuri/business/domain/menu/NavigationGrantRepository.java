package nuri.business.domain.menu;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.auth.MenuAuthorityProjection;
import nuri.business.domain.auth.MenuCreatManageProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

/** 메뉴 노출은 NAVIGATION grant만 소비하며 OPERATION 권한으로 승격하지 않는다. */
@Repository
@RequiredArgsConstructor
public class NavigationGrantRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public Set<Long> findAllowedMenuIds(List<String> groups) {
        if (groups.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(jdbc.query("""
                SELECT DISTINCT menu.menu_sn
                  FROM tb_menu_info menu
                  JOIN tb_authrt_grnt_map grant_row
                    ON grant_row.authrt_grnt_cd=CAST(menu.menu_sn AS varchar(20))
                 WHERE grant_row.authrt_type_cd='NAVIGATION'
                   AND grant_row.authrt_cd IN (:groups)
                """, Map.of("groups", groups), (result, row) -> result.getLong("menu_sn")));
    }

    /** 기존 메뉴 배정 조회 API의 읽기 호환 표현이다. 저장은 버전이 있는 새 계약을 사용한다. */
    public List<MenuAuthorityProjection> selectMenuCreatList(String group) {
        return jdbc.query("""
                SELECT menu.menu_sn,menu.menu_nm,menu.up_menu_sn,
                       CASE WHEN EXISTS (
                           SELECT 1 FROM tb_authrt_grnt_map grant_row
                            WHERE grant_row.authrt_cd=:group
                              AND grant_row.authrt_type_cd='NAVIGATION'
                              AND grant_row.authrt_grnt_cd=CAST(menu.menu_sn AS varchar(20))
                       ) THEN 'Y' ELSE 'N' END AS reg_yn
                  FROM tb_menu_info menu
                 ORDER BY menu.menu_ordr,menu.menu_sn
                """, Map.of("group", group), (result, row) -> MenuAuthorityProjection.builder()
                .authrtCd(group)
                .menuSn(result.getLong("menu_sn"))
                .menuNm(result.getString("menu_nm"))
                .upperMenuSn(result.getObject("up_menu_sn", Long.class))
                .regYn(result.getString("reg_yn"))
                .build());
    }

    public Page<MenuCreatManageProjection> selectMenuCreatManagList(String keyword, Pageable pageable) {
        Map<String, Object> parameters = Map.of(
                "keyword", keyword,
                "limit", pageable.isPaged() ? pageable.getPageSize() : Integer.MAX_VALUE,
                "offset", pageable.isPaged() ? pageable.getOffset() : 0L);
        List<MenuCreatManageProjection> rows = jdbc.query("""
                SELECT group_row.authrt_cd,group_row.authrt_nm,group_row.authrt_expln,group_row.authrt_crt_ymd,
                       (SELECT count(*) FROM tb_authrt_grnt_map grant_row
                         WHERE grant_row.authrt_cd=group_row.authrt_cd
                           AND grant_row.authrt_type_cd='NAVIGATION') AS navigation_count
                  FROM tb_authrt_info group_row
                 WHERE :keyword='' OR POSITION(:keyword IN group_row.authrt_nm)>0
                 ORDER BY group_row.authrt_cd
                 LIMIT :limit OFFSET :offset
                """, parameters, (result, row) -> MenuCreatManageProjection.builder()
                .authrtCd(result.getString("authrt_cd"))
                .authrtNm(result.getString("authrt_nm"))
                .authrtExpln(result.getString("authrt_expln"))
                .authrtCrtYmd(result.getString("authrt_crt_ymd"))
                .chkYeoBu(result.getLong("navigation_count"))
                .build());
        Long count = jdbc.queryForObject("""
                SELECT count(*) FROM tb_authrt_info
                 WHERE :keyword='' OR POSITION(:keyword IN authrt_nm)>0
                """, Map.of("keyword", keyword), Long.class);
        return new PageImpl<>(rows, pageable, count == null ? 0L : count);
    }
}
