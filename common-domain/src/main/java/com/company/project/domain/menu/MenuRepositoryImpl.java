package com.company.project.domain.menu;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.menu.QMenu.menu;
import static com.company.project.domain.program.QProgram.program;
import static com.company.project.domain.auth.QMenuAuthority.menuAuthority;
import static com.company.project.domain.auth.QUserAuthority.userAuthority;

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

                return new PageImpl<>(content, pageable, total);
        }

        @Override
        public List<MenuProjection> selectMainMenuHead(String uniqId) {
                return queryFactory
                                .select(Projections.bean(MenuProjection.class,
                                                menu.id.as("menuNo"),
                                                menu.menuOrdr.as("menuOrdr"),
                                                menu.menuNm.as("menuNm"),
                                                menu.upperMenuNo.as("upperMenuId"),
                                                menu.menuDc.as("menuDc"),
                                                menu.relateImagePath.as("relateImagePath"),
                                                menu.relateImageNm.as("relateImageNm"),
                                                menu.progrmFileNm.as("progrmFileNm"),
                                                program.url.as("chkURL")))
                                .from(menuAuthority)
                                .join(menu).on(menuAuthority.id.menuNo.eq(menu.id))
                                .leftJoin(program).on(menu.progrmFileNm.eq(program.progrmFileNm))
                                .where(menu.upperMenuNo.eq(0L)
                                                .and(menuAuthority.id.authorCode.eq(
                                                                queryFactory.select(userAuthority.authorCode)
                                                                                .from(userAuthority)
                                                                                .where(userAuthority.uniqId
                                                                                                .eq(uniqId)))))
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();
        }

        @Override
        public List<MenuProjection> selectMainMenuLeft(String uniqId) {
                return queryFactory
                                .select(Projections.bean(MenuProjection.class,
                                                menu.id.as("menuNo"),
                                                menu.menuOrdr.as("menuOrdr"),
                                                menu.menuNm.as("menuNm"),
                                                menu.upperMenuNo.as("upperMenuId"),
                                                menu.relateImagePath.as("relateImagePath"),
                                                menu.relateImageNm.as("relateImageNm"),
                                                program.url.as("chkURL")))
                                .from(menuAuthority)
                                .join(menu).on(menuAuthority.id.menuNo.eq(menu.id))
                                .leftJoin(program).on(menu.progrmFileNm.eq(program.progrmFileNm))
                                .where(menuAuthority.id.authorCode.eq(
                                                queryFactory.select(userAuthority.authorCode)
                                                                .from(userAuthority)
                                                                .where(userAuthority.uniqId.eq(uniqId))))
                                .orderBy(menu.menuOrdr.asc())
                                .fetch();
        }

        private com.querydsl.core.types.dsl.BooleanExpression menuNmLike(String searchKeyword) {
                return StringUtils.hasText(searchKeyword) ? menu.menuNm.contains(searchKeyword) : null;
        }
}
