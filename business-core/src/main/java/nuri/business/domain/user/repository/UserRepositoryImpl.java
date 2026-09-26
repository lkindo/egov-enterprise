package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import com.querydsl.core.types.Projections;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserSearchDto;

import static nuri.business.domain.user.entity.QUser.user;
import static nuri.business.domain.user.entity.QUserAbsence.userAbsence;
import static nuri.business.domain.organization.QOrganizationManage.organizationManage;

@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<UserDto> getPagedUserList(String searchKeyword, Pageable pageable) {
        BooleanExpression condition = null;
        if (StringUtils.hasText(searchKeyword)) {
            condition = user.userId.containsIgnoreCase(searchKeyword)
                    .or(user.userNm.containsIgnoreCase(searchKeyword));
        }

        List<UserDto> content = queryFactory
                .select(Projections.constructor(UserDto.class,
                        user.userId,
                        user.userNm,
                        user.esntlId,
                        user.role.stringValue(),
                        user.emplNo,
                        user.officeTelno,
                        user.mblTelno,
                        user.emlAddr,
                        user.ofcpsNm,
                        user.crtDt))
                .from(user)
                .where(condition)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(user.userId.asc())
                .fetch();

        long total = queryFactory
                .select(user.count())
                .from(user)
                .where(condition)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    @Override
    public Page<User> searchUsers(String sbscrbSttus, String searchCondition, String searchKeyword, Pageable pageable) {

        List<User> content = queryFactory
                .selectFrom(user)
                .where(
                        statusEq(sbscrbSttus),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(user.userId.desc())
                .fetch();

        long total = queryFactory
                .select(user.count())
                .from(user)
                .where(
                        statusEq(sbscrbSttus),
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    @Override
    public List<UserSearchDto> searchAssignableUsers(String keyword, int limit) {
        // [열거 방어] 빈 키워드에 조건을 붙이지 않으면 QueryDSL 은 where 절 없이 전체를 반환한다
        //   (바로 위 getPagedUserList 가 그 동작이다 — 관리자 전용이라 허용되는 것이다).
        //   이 메서드는 일반 사용자에게 열리므로 같은 실수를 되풀이하지 않는다.
        String trimmed = keyword == null ? "" : keyword.trim();
        if (!StringUtils.hasText(trimmed) || limit <= 0) {
            return List.of();
        }

        // 부서명은 tb_ognz_info 에 있고 User 에는 연관관계 없이 ognz_id 컬럼만 있다.
        // 행마다 findById 로 끌어오면 N+1 이 되므로 on 절 조인 한 번으로 해결한다.
        // 소속이 없거나(ognz_id null) 조직 행이 지워진 사용자도 검색에서 사라지면 안 되므로 leftJoin 이다.
        return queryFactory
                .select(Projections.constructor(UserSearchDto.class,
                        user.esntlId,
                        user.userNm,
                        organizationManage.ognzNm,
                        // [2026-09-26 DIP B4 P4] 부재 표시. 기록이 없으면 정상이다(부재 관리 화면과 같은 판정).
                        userAbsence.userAbsnYn.coalesce("N").eq("Y")))
                .from(user)
                .leftJoin(organizationManage).on(organizationManage.ognzId.eq(user.ognzId))
                .leftJoin(userAbsence).on(userAbsence.userId.eq(user.esntlId))
                // 검색 축은 성명 하나다. userId(로그인 ID)로도 매칭하면 "kim01" 로 조회해
                // 로그인 ID ↔ 실명을 이어 붙이는 계정 열거 창구가 된다.
                // [2026-09-26 DIP B4 P4] 사용 중(P)인 계정만 고를 수 있다. 승인 대기·사용 중지 계정을 담당자·결재자·수신자로
                //   고르면 서버가 거부하거나(결재) 아무도 받지 못한다.
                .where(user.userNm.containsIgnoreCase(trimmed), user.userSttsCd.eq("P"))
                .orderBy(user.userNm.asc(), user.esntlId.asc())
                .limit(limit)
                .fetch();
    }

    @Override
    public int checkIdDplct(String checkId) {
        return (int) queryFactory
                .select(user.count())
                .from(user)
                .where(user.userId.eq(checkId))
                .fetchOne().longValue();
    }

    private BooleanExpression statusEq(String sbscrbSttus) {
        if (!StringUtils.hasText(sbscrbSttus) || "0".equals(sbscrbSttus)) {
            return null;
        }
        try {
            Role role = Role.valueOf(sbscrbSttus);
            return user.role.eq(role);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition) || "USER_ID".equals(searchCondition)) {
            return user.userId.contains(searchKeyword);
        } else if ("1".equals(searchCondition) || "USER_NM".equals(searchCondition)) {
            return user.userNm.contains(searchKeyword);
        } else if ("OFFM_TELNO".equals(searchCondition) || "OFFICE_TELNO".equals(searchCondition)) {
            return user.officeTelno.contains(searchKeyword);
        }

        return null;
    }
}
