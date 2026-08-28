package nuri.business.domain.auth;

import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.auth.QAuthority.authority;

@RequiredArgsConstructor
public class AuthorityRepositoryImpl implements AuthorityRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Authority> searchAuthorities(String searchCondition, String searchKeyword, @NonNull Pageable pageable) {
        List<Authority> content = queryFactory
                .selectFrom(authority)
                .where(conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(orderOf(pageable))
                .fetch();

        Long total = queryFactory
                .select(authority.count())
                .from(authority)
                .where(conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                total != null ? total : 0L);
    }

    /**
     * 호출자가 준 정렬을 그대로 쓴다. 없으면 권한코드 오름차순이 기본이다.
     *
     * <p>[2026-08-28] 종전에는 {@code authrtCrtYmd desc} 가 하드코딩돼 <b>pageable 의 Sort 가
     * 무시</b>됐다. 서비스가 {@code Sort.by("authrtCd").ascending()} 을 실어 보내도 생성일 역순으로
     * 나왔다는 뜻이다 — 이 메서드를 목록 경로에 배선하는 순간 화면 정렬이 조용히 뒤집힌다.
     */
    private OrderSpecifier<?>[] orderOf(Pageable pageable) {
        List<OrderSpecifier<?>> orders = new ArrayList<>();
        for (Sort.Order order : pageable.getSort()) {
            Order direction = order.isAscending() ? Order.ASC : Order.DESC;
            switch (order.getProperty()) {
                case "authrtCd" -> orders.add(new OrderSpecifier<>(direction, authority.authrtCd));
                case "authrtNm" -> orders.add(new OrderSpecifier<>(direction, authority.authrtNm));
                case "authrtCrtYmd" -> orders.add(new OrderSpecifier<>(direction, authority.authrtCrtYmd));
                // 알 수 없는 정렬 키는 조용히 무시하지 않고 기본값으로 수렴시킨다 —
                // 임의 컬럼을 정렬에 노출하면 인덱스 없는 컬럼 정렬이 API 로 승격된다.
                default -> { }
            }
        }
        if (orders.isEmpty()) {
            orders.add(new OrderSpecifier<>(Order.ASC, authority.authrtCd));
        }
        return orders.toArray(new OrderSpecifier<?>[0]);
    }

    /**
     * 검색 조건.
     *
     * <p>[2026-08-28] 종전에는 {@code searchCondition == "1"} 일 때만 필터를 만들고 그 밖에는
     * {@code null} 을 돌려줬다. QueryDSL 에서 {@code where(null)} 은 무시되므로 <b>검색어가 통째로
     * 버려졌다</b>. 그런데 권한 목록 화면(SecurityHubClient)은 {@code searchCondition} 을 보내지
     * 않는다 — 즉 이 게이트를 그대로 두고 상위만 배선하면 검색은 여전히 죽은 채 테스트만 green 이
     * 된다. 키워드가 있으면 화면 라벨이 약속하는 범위(권한 코드 또는 명칭)로 필터한다.
     *
     * <p>{@code searchCondition == "1"} 분기는 명칭 한정 검색을 요구하는 기존 호출 계약이므로
     * 그대로 보존한다(H4 — 같은 문법이 같은 의미를 뜻하지 않는다).
     */
    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return authority.authrtNm.contains(searchKeyword);
        }

        return authority.authrtCd.contains(searchKeyword)
                .or(authority.authrtNm.contains(searchKeyword));
    }
}
