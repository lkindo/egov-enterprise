package com.company.project.domain.auth;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.auth.QAuthority.authority;
import static com.company.project.domain.auth.QMenuAuthority.menuAuthority;
import static com.company.project.domain.menu.QMenu.menu;

@RequiredArgsConstructor
public class MenuAuthorityRepositoryImpl implements MenuAuthorityRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<MenuAuthorityProjection> selectMenuCreatList(String authorCode) {
        return queryFactory
                .select(Projections.bean(MenuAuthorityProjection.class,
                        menu.id.as("menuNo"),
                        menu.menuNm.as("menuNm"),
                        menu.upperMenuNo.as("upperMenuNo"),
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
    public Page<Authority> selectMenuCreatManagList(String searchKeyword, Pageable pageable) {
        List<Authority> content = queryFactory
                .selectFrom(authority)
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

        return new PageImpl<>(content, pageable, total);
    }

    private com.querydsl.core.types.dsl.BooleanExpression authorNmLike(String searchKeyword) {
        return StringUtils.hasText(searchKeyword) ? authority.authorNm.contains(searchKeyword) : null;
    }
}
