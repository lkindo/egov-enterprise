package nuri.business.domain.auth;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.auth.QRoleInfo.roleInfo;
import static nuri.business.domain.code.QCommonCode.commonCode;

@RequiredArgsConstructor
public class RoleInfoRepositoryImpl implements RoleInfoRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<RoleInfoProjection> selectRoleList(String searchKeyword, Pageable pageable) {
                List<RoleInfoProjection> content = queryFactory
                                .select(Projections.bean(RoleInfoProjection.class,
                                                roleInfo.roleId,
                                                roleInfo.roleNm,
                                                roleInfo.rolePatrn,
                                                roleInfo.roleExpln,
                                                roleInfo.roleTypeCd,
                                                commonCode.dtlCdNm.as("roleTyNm"),
                                                roleInfo.roleSort,
                                                roleInfo.roleCrtYmd.as("crtDt")))
                                .from(roleInfo)
                                .leftJoin(commonCode).on(
                                                commonCode.cdId.eq("COM029")
                                                                .and(commonCode.dtlCd.eq(roleInfo.roleTypeCd)))
                                .where(roleNmLike(searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(roleInfo.roleCrtYmd.desc())
                                .fetch();

                long total = queryFactory
                                .select(roleInfo.count())
                                .from(roleInfo)
                                .where(roleNmLike(searchKeyword))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        /**
         * 롤 검색 조건.
         *
         * <p>[2026-08-28] 종전에는 {@code roleNm} 만 매칭했다. 그런데 화면의 조회 조건 라벨은
         * '롤코드 · 롤명', placeholder 는 '롤코드 또는 롤명으로 검색' 이고 목록 첫 열도 롤코드다.
         * 사용자가 눈앞에 보이는 롤코드를 그대로 치면 항상 0건이 되어 <b>존재하는 롤이 '그런 롤이
         * 없다'로 보였다</b> — 기관코드 검색과 같은 모양의 함정이다.
         *
         * <p>목록과 총건수가 같은 조건을 쓰도록 이 한 메서드만 통과시킨다. 두 곳에 조건을 따로
         * 적으면 "3건이 보이는데 총 240건" 같은 어긋남이 생긴다.
         */
        private BooleanExpression roleNmLike(String searchKeyword) {
                if (!StringUtils.hasText(searchKeyword)) {
                        return null;
                }
                return roleInfo.roleNm.contains(searchKeyword)
                                .or(roleInfo.roleId.containsIgnoreCase(searchKeyword));
        }
}
