package nuri.business.domain.auth;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.auth.QAuthorityRole.authorityRole;
import static nuri.business.domain.auth.QRoleInfo.roleInfo;

@RequiredArgsConstructor
public class AuthorityRoleRepositoryImpl implements AuthorityRoleRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<AuthorRoleProjection> searchAuthorRoles(String authrtCd, Pageable pageable) {
                List<AuthorRoleProjection> content = queryFactory
                                .select(Projections.bean(AuthorRoleProjection.class,
                                                roleInfo.roleId.as("roleId"),
                                                roleInfo.roleNm.as("roleNm"),
                                                roleInfo.rolePatrn.as("rolePatrn"),
                                                roleInfo.roleExpln.as("roleExpln"),
                                                roleInfo.roleTypeCd.as("roleTypeCd"),
                                                roleInfo.roleSort.stringValue().as("roleSort"),
                                                authorityRole.id.authrtCd.as("authrtCd"),
                                                new CaseBuilder()
                                                                .when(authorityRole.id.authrtCd.isNotNull()).then("Y")
                                                                .otherwise("N").as("regYn"),
                                                authorityRole.crtDt.as("crtDt")))
                                .from(roleInfo)
                                .leftJoin(authorityRole).on(roleInfo.roleId.eq(authorityRole.id.roleCd)
                                                .and(authorityRole.id.authrtCd.eq(authrtCd)))
                                .orderBy(roleInfo.roleSort.asc().nullsLast(), roleInfo.roleId.asc())
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                long total = queryFactory
                                .select(roleInfo.count())
                                .from(roleInfo)
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }
}
