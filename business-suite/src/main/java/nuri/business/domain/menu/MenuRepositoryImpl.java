package nuri.business.domain.menu;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.menu.QMenu.menu;
import static nuri.business.domain.program.QProgram.program;
import static nuri.business.domain.auth.QMenuAuthority.menuAuthority;
import static nuri.business.domain.auth.QUserAuthority.userAuthority;

@RequiredArgsConstructor
public class MenuRepositoryImpl implements MenuRepositoryCustom {

        private final JPAQueryFactory queryFactory;

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
                return queryFactory
                                .select(Projections.bean(MenuProjection.class,
                                                 menu.menuSn.as("menuNo"),
                                                 menu.menuOrdr.as("menuOrdr"),
                                                 menu.menuNm.as("menuNm"),
                                                 menu.upMenuSn.as("upperMenuId"),
                                                 menu.menuExpln.as("menuDc"),
                                                 menu.relImgPath.as("relateImagePath"),
                                                 menu.relImgNm.as("relateImageNm"),
                                                 menu.prgrmFileNm.as("progrmFileNm"),
                                                 program.url.as("chkURL")))
                                .from(menuAuthority)
                                .join(menu).on(menuAuthority.id.menuSn.eq(menu.menuSn))
                                .leftJoin(program).on(menu.prgrmFileNm.eq(program.prgrmFileNm))
                                .where(menu.upMenuSn.eq(0L)
                                                .and(menuAuthority.id.authrtCd.eq(
                                                                queryFactory.select(userAuthority.authrtId)
                                                                                .from(userAuthority)
                                                                                .where(userAuthority.scrtyDcsnTrgtId
                                                                                                .eq(uniqId)))))
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();
        }

        @Override
        public List<MenuProjection> selectMainMenuLeft(String uniqId) {
                return queryFactory
                                .select(Projections.bean(MenuProjection.class,
                                                 menu.menuSn.as("menuNo"),
                                                 menu.menuOrdr.as("menuOrdr"),
                                                 menu.menuNm.as("menuNm"),
                                                 menu.upMenuSn.as("upperMenuId"),
                                                 menu.relImgPath.as("relateImagePath"),
                                                 menu.relImgNm.as("relateImageNm"),
                                                 program.url.as("chkURL")))
                                .from(menuAuthority)
                                .join(menu).on(menuAuthority.id.menuSn.eq(menu.menuSn))
                                .leftJoin(program).on(menu.prgrmFileNm.eq(program.prgrmFileNm))
                                .where(menuAuthority.id.authrtCd.eq(
                                                queryFactory.select(userAuthority.authrtId)
                                                                .from(userAuthority)
                                                                .where(userAuthority.scrtyDcsnTrgtId.eq(uniqId))))
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();
        }


        private com.querydsl.core.types.dsl.BooleanExpression menuNmLike(String searchKeyword) {
                return StringUtils.hasText(searchKeyword) ? menu.menuNm.contains(searchKeyword) : null;
        }
}
