package nuri.foundation.domain.auth;

import com.querydsl.core.types.ExpressionUtils;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.foundation.domain.auth.QAuthority.authority;
import static nuri.foundation.domain.auth.QMenuAuthority.menuAuthority;
import static nuri.foundation.domain.menu.QMenu.menu;

@RequiredArgsConstructor
public class MenuAuthorityRepositoryImpl implements MenuAuthorityRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public List<MenuAuthorityProjection> selectMenuCreatList(String authrtCd) {
                return queryFactory
                                .select(Projections.bean(MenuAuthorityProjection.class,
                                                menu.id.as("menuSn"),
                                                menu.menuNm.as("menuNm"),
                                                menu.upperMenuSn.as("upperMenuSn"),
                                                Expressions.asString(authrtCd).as("authrtCd"),
                                                new CaseBuilder()
                                                                .when(menuAuthority.id.authrtCd.isNotNull()).then("Y")
                                                                .otherwise("N").as("regYn")))
                                .from(menu)
                                .leftJoin(menuAuthority)
                                .on(menu.id.eq(menuAuthority.id.menuSn).and(menuAuthority.id.authrtCd.eq(authrtCd)))
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();
        }

        @Override
        public Page<MenuCreatManageProjection> selectMenuCreatManagList(String searchKeyword, Pageable pageable) {
                List<MenuCreatManageProjection> content = queryFactory
                                .select(Projections.bean(MenuCreatManageProjection.class,
                                                authority.authrtCd,
                                                authority.authrtNm,
                                                authority.authrtExpln,
                                                authority.authrtCrtYmd,
                                                ExpressionUtils.as(
                                                                JPAExpressions.select(menuAuthority.count())
                                                                                .from(menuAuthority)
                                                                                .where(menuAuthority.id.authrtCd.eq(
                                                                                                authority.authrtCd)),
                                                                "chkYeoBu")))
                                .from(authority)
                                .where(authorNmLike(searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(authority.authrtCd.asc())
                                .fetch();

                long total = queryFactory
                                .select(authority.count())
                                .from(authority)
                                .where(authorNmLike(searchKeyword))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        private com.querydsl.core.types.dsl.BooleanExpression authorNmLike(String searchKeyword) {
                return StringUtils.hasText(searchKeyword) ? authority.authrtNm.contains(searchKeyword) : null;
        }
}
