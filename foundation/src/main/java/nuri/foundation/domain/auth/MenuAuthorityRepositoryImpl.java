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
        public List<MenuAuthorityProjection> selectMenuCreatList(String authorCode) {
                return queryFactory
                                .select(Projections.bean(MenuAuthorityProjection.class,
                                                menu.id.as("menuNo"),
                                                menu.menuNm.as("menuNm"),
                                                menu.upperMenuSn.as("upperMenuNo"),
                                                Expressions.asString(authorCode).as("authorCode"),
                                                new CaseBuilder()
                                                                .when(menuAuthority.id.authorCode.isNotNull()).then("Y")
                                                                .otherwise("N").as("regYn")))
                                .from(menu)
                                .leftJoin(menuAuthority)
                                .on(menu.id.eq(menuAuthority.id.menuNo).and(menuAuthority.id.authorCode.eq(authorCode)))
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();
        }

        @Override
        public Page<MenuCreatManageProjection> selectMenuCreatManagList(String searchKeyword, Pageable pageable) {
                List<MenuCreatManageProjection> content = queryFactory
                                .select(Projections.bean(MenuCreatManageProjection.class,
                                                authority.authorCode,
                                                authority.authorNm,
                                                authority.authorDc,
                                                authority.authorCreatDe,
                                                ExpressionUtils.as(
                                                                JPAExpressions.select(menuAuthority.count())
                                                                                .from(menuAuthority)
                                                                                .where(menuAuthority.id.authorCode.eq(
                                                                                                authority.authorCode)),
                                                                "chkYeoBu")))
                                .from(authority)
                                .where(authorNmLike(searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(authority.authorCode.asc())
                                .fetch();

                long total = queryFactory
                                .select(authority.count())
                                .from(authority)
                                .where(authorNmLike(searchKeyword))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        private com.querydsl.core.types.dsl.BooleanExpression authorNmLike(String searchKeyword) {
                return StringUtils.hasText(searchKeyword) ? authority.authorNm.contains(searchKeyword) : null;
        }
}
