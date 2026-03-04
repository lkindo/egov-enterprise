package com.company.project.domain.auth;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Objects;

import static com.company.project.domain.auth.QAuthorityRole.authorityRole;
import static com.company.project.domain.auth.QRoleInfo.roleInfo;

@RequiredArgsConstructor
public class AuthorityRoleRepositoryImpl implements AuthorityRoleRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<AuthorRoleProjection> searchAuthorRoles(String authorCode, Pageable pageable) {
                List<AuthorRoleProjection> content = queryFactory
                                .select(Projections.bean(AuthorRoleProjection.class,
                                                roleInfo.roleCode.as("roleCode"),
                                                roleInfo.roleNm.as("roleNm"),
                                                roleInfo.rolePttrn.as("rolePtn"),
                                                roleInfo.roleDc.as("roleDc"),
                                                roleInfo.roleTy.as("roleTyp"),
                                                roleInfo.roleSort.as("roleSort"),
                                                authorityRole.id.authorCode.as("authorCode"),
                                                new CaseBuilder()
                                                                .when(authorityRole.id.authorCode.isNotNull()).then("Y")
                                                                .otherwise("N").as("regYn"),
                                                authorityRole.creatDt.as("creatDt")))
                                .from(roleInfo)
                                .leftJoin(authorityRole).on(roleInfo.roleCode.eq(authorityRole.id.roleCode)
                                                .and(authorityRole.id.authorCode.eq(authorCode)))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(roleInfo.roleSort.asc())
                                .fetch();

                long total = queryFactory
                                .select(roleInfo.count())
                                .from(roleInfo)
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }
}