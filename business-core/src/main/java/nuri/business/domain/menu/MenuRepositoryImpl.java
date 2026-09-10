package nuri.business.domain.menu;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import static nuri.business.domain.menu.QMenu.menu;

@RequiredArgsConstructor
public class MenuRepositoryImpl implements MenuRepositoryCustom {

        private final JPAQueryFactory queryFactory;
        private final NamedParameterJdbcTemplate jdbc;

        @Override
        public Page<Menu> searchMenus(String searchKeyword, Pageable pageable) {
                List<Menu> content = queryFactory
                                .selectFrom(menu)
                                .where(menuNmLike(searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();

                long total = queryFactory
                                .select(menu.count())
                                .from(menu)
                                .where(menuNmLike(searchKeyword))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        @Override
        public List<MenuProjection> selectMainMenuHead(String uniqId) {
                return selectAssignedMenus(uniqId, true);
        }

        @Override
        public List<MenuProjection> selectMainMenuLeft(String uniqId) {
                return selectAssignedMenus(uniqId, false);
        }

        private List<MenuProjection> selectAssignedMenus(String uniqId, boolean rootsOnly) {
                return jdbc.query("""
                        SELECT menu_row.menu_sn,menu_row.menu_ordr,menu_row.menu_nm,menu_row.up_menu_sn,
                               menu_row.menu_expln,menu_row.rel_img_path,menu_row.rel_img_nm,
                               menu_row.prgrm_file_nm,program_row.url
                          FROM tb_menu_info menu_row
                          LEFT JOIN tb_prgrm_lst program_row
                            ON program_row.prgrm_file_nm=menu_row.prgrm_file_nm
                         WHERE menu_row.use_yn='Y'
                           AND (:rootsOnly=false OR menu_row.up_menu_sn IS NULL)
                           AND EXISTS (
                               SELECT 1 FROM tb_authrt_user_map membership
                               JOIN tb_authrt_grnt_map grant_row ON grant_row.authrt_cd=membership.authrt_cd
                               WHERE membership.scrty_dcsn_trgt_id=:userId
                                 AND grant_row.authrt_type_cd='NAVIGATION'
                                 AND grant_row.authrt_grnt_cd=CAST(menu_row.menu_sn AS varchar(20))
                           )
                         ORDER BY menu_row.menu_ordr,menu_row.menu_sn
                        """, Map.of("userId", uniqId, "rootsOnly", rootsOnly), (result, row) -> MenuProjection.builder()
                        .menuNo(result.getLong("menu_sn"))
                        .menuOrdr(result.getObject("menu_ordr", Integer.class))
                        .menuNm(result.getString("menu_nm"))
                        .upperMenuId(result.getObject("up_menu_sn", Long.class))
                        .menuDc(rootsOnly ? result.getString("menu_expln") : null)
                        .relateImagePath(result.getString("rel_img_path"))
                        .relateImageNm(result.getString("rel_img_nm"))
                        .progrmFileNm(rootsOnly ? result.getString("prgrm_file_nm") : null)
                        .chkURL(result.getString("url"))
                        .build());
        }


        private com.querydsl.core.types.dsl.BooleanExpression menuNmLike(String searchKeyword) {
                return StringUtils.hasText(searchKeyword) ? menu.menuNm.contains(searchKeyword) : null;
        }
}
