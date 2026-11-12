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
import com.querydsl.core.types.Projections;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserSearchDto;

import static nuri.business.domain.user.entity.QUser.user;
import static nuri.business.domain.user.entity.QUserAbsence.userAbsence;
import static nuri.business.domain.organization.QOrganizationManage.organizationManage;

@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    private final jakarta.persistence.EntityManager entityManager;

    private final nuri.foundation.core.persistence.VendorSqlDialect vendorSql;

    /** 삭제 잠금 문장. 통합 시험이 같은 문장으로 자식 FK 입력이 기다리는지 본다. 바인딩 이름은 {@code esntlId} 다. */
    public static String lockForDeletionSql(nuri.foundation.core.persistence.VendorSqlDialect vendorSql) {
        return vendorSql.selectForLock("esntl_id", "tb_user_info", "WHERE esntl_id = :esntlId",
                nuri.foundation.core.persistence.VendorSqlDialect.RowLock.FOR_UPDATE);
    }

    @Override
    public java.util.Optional<String> lockForDeletion(String esntlId) {
        java.util.List<?> rows = entityManager.createNativeQuery(lockForDeletionSql(vendorSql)).setParameter("esntlId", esntlId)
                .getResultList();
        return rows.stream().findFirst().map(String::valueOf);
    }

    /**
     * [2026-10-18] 이미 읽어 둔 사용자 행을 쓰기 잠금으로 다시 읽어 메모리 상태를 DB 의 현재 값으로 덮는다.
     *
     * <p>잠금 조회({@code findByUserIdForUpdate})는 같은 영속성 컨텍스트에 이미 있는 엔티티를 그대로 돌려줘 상태를
     * 새로 읽지 않는다 — 잠금만 걸리고 낡은 실패 횟수로 계산하게 된다. {@code refresh} 는 잠금과 재조회를 한 문장으로 한다.
     * 메모리에서 바꾼 값은 버려지므로 호출자는 잠근 뒤에 상태를 바꾼다.
     */
    @Override
    public void refreshForUpdate(User target) {
        entityManager.refresh(java.util.Objects.requireNonNull(target), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    }

    @Override
    public Page<UserDto> getPagedUserList(String searchKeyword, UserListFilter filter,
            Pageable pageable) {
        BooleanExpression condition = null;
        if (StringUtils.hasText(searchKeyword)) {
            condition = user.userId.containsIgnoreCase(searchKeyword)
                    .or(user.userNm.containsIgnoreCase(searchKeyword));
        }
        // [2026-09-26 DIP B5 F4] 계정 상태·소속 부서·로그인 잠금 조건. 비어 있으면 걸지 않는다.
        //   잠금 'N' 은 잠기지 않은 계정이며 값이 비어 있는(잠긴 적 없는) 행도 포함한다.
        if (filter != null) {
            if (filter.userSttsCd() != null) condition = and(condition, user.userSttsCd.eq(filter.userSttsCd()));
            if (filter.ognzId() != null) condition = and(condition, user.ognzId.eq(filter.ognzId()));
            if ("Y".equals(filter.lckYn())) condition = and(condition, user.lckYn.eq("Y"));
            if ("N".equals(filter.lckYn())) condition = and(condition, user.lckYn.isNull().or(user.lckYn.ne("Y")));
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
                        user.ognzId,
                        user.userSttsCd,
                        user.lckYn,
                        user.crtDt))
                .from(user)
                .where(condition)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(userListOrder(pageable))
                .fetch()
                // [2026-10-18] 목록은 휴대전화·이메일을 가린다. 원문은 정보주체를 기록하는 상세 조회에서만 나간다(UserDto#withMaskedContacts).
                .stream().map(UserDto::withMaskedContacts).toList();

        long total = queryFactory
                .select(user.count())
                .from(user)
                .where(condition)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    /**
     * [Wave 4 GAP-UI-001] 목록 정렬 — 컨트롤러 허용 목록이 고른 속성만 고정 경로로 바꾼다(임의 경로를 만들지 않는다). 같은 이름·등록일시
     * 끼리는 로그인 ID 로 끊어 페이지가 바뀌어도 순서가 흔들리지 않게 한다. 정렬이 없으면 종전대로 로그인 ID 오름차순이다.
     */
    private static com.querydsl.core.types.OrderSpecifier<?>[] userListOrder(Pageable pageable) {
        List<com.querydsl.core.types.OrderSpecifier<?>> orders = new java.util.ArrayList<>();
        for (org.springframework.data.domain.Sort.Order order : pageable.getSort()) {
            com.querydsl.core.types.Order direction = order.isAscending()
                    ? com.querydsl.core.types.Order.ASC : com.querydsl.core.types.Order.DESC;
            switch (order.getProperty()) {
                case "userId" -> orders.add(new com.querydsl.core.types.OrderSpecifier<>(direction, user.userId));
                case "userNm" -> orders.add(new com.querydsl.core.types.OrderSpecifier<>(direction, user.userNm));
                case "crtDt" -> orders.add(new com.querydsl.core.types.OrderSpecifier<>(direction, user.crtDt));
                default -> { }
            }
        }
        if (orders.stream().noneMatch(order -> order.getTarget().equals(user.userId))) {
            orders.add(user.userId.asc());
        }
        return orders.toArray(new com.querydsl.core.types.OrderSpecifier<?>[0]);
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
    public List<UserSearchDto> findActiveDepartmentMembers(String ognzId, int limit) {
        // 빈 부서 식별자에 조건을 붙이지 않으면 전체가 나온다 — searchAssignableUsers 와 같은 방어.
        if (!StringUtils.hasText(ognzId) || limit <= 0) {
            return List.of();
        }
        return queryFactory
                .select(Projections.constructor(UserSearchDto.class,
                        user.esntlId,
                        user.userNm,
                        organizationManage.ognzNm,
                        userAbsence.userAbsnYn.coalesce("N").eq("Y")))
                .from(user)
                .leftJoin(organizationManage).on(organizationManage.ognzId.eq(user.ognzId))
                .leftJoin(userAbsence).on(userAbsence.userId.eq(user.esntlId))
                // 사용 중(P) 계정만 — 승인 대기·사용 중지 계정은 받을 사람이 없다(searchAssignableUsers 와 같은 판정).
                .where(user.ognzId.eq(ognzId), user.userSttsCd.eq("P"))
                .orderBy(user.userNm.asc(), user.esntlId.asc())
                .limit(limit)
                .fetch();
    }

    @Override
    public List<UserSearchDto> findProfilesByEsntlIds(java.util.Collection<String> esntlIds) {
        // 빈 목록에 in 조건을 붙이지 않는다 — 조건 없는 전체 조회가 되지 않게 먼저 끊는다.
        if (esntlIds == null || esntlIds.isEmpty()) {
            return List.of();
        }
        return queryFactory
                .select(Projections.constructor(UserSearchDto.class,
                        user.esntlId,
                        user.userNm,
                        organizationManage.ognzNm,
                        userAbsence.userAbsnYn.coalesce("N").eq("Y")))
                .from(user)
                .leftJoin(organizationManage).on(organizationManage.ognzId.eq(user.ognzId))
                .leftJoin(userAbsence).on(userAbsence.userId.eq(user.esntlId))
                .where(user.esntlId.in(esntlIds))
                .fetch();
    }

    private static BooleanExpression and(BooleanExpression left, BooleanExpression right) {
        return left == null ? right : left.and(right);
    }
}
