package com.company.project.domain.auth;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.auth.QRoleInfo.roleInfo;
import static com.company.project.domain.code.QCommonCode.commonCode;

@RequiredArgsConstructor
public class RoleInfoRepositoryImpl implements RoleInfoRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<RoleInfoProjection> selectRoleList(String searchKeyword, Pageable pageable) {
        List<RoleInfoProjection> content = queryFactory
                .select(Projections.bean(RoleInfoProjection.class,
                        roleInfo.roleCode,
                        roleInfo.roleNm,
                        roleInfo.rolePttrn,
                        roleInfo.roleDc,
                        roleInfo.roleTy,
                        commonCode.codeNm.as("roleTyNm"),
                        roleInfo.roleSort,
                        roleInfo.creatDt))
                .from(roleInfo)
                .leftJoin(commonCode).on(
                        commonCode.codeGroupId.eq("COM029")
                                .and(commonCode.code.eq(roleInfo.roleTy)))
                .where(roleNmLike(searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(roleInfo.creatDt.desc())
                .fetch();

        long total = queryFactory
                .select(roleInfo.count())
                .from(roleInfo)
                .where(roleNmLike(searchKeyword))
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression roleNmLike(String searchKeyword) {
        return StringUtils.hasText(searchKeyword) ? roleInfo.roleNm.contains(searchKeyword) : null;
    }
}
