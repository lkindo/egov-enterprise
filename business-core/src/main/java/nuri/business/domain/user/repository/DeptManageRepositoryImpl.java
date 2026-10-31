package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.user.entity.QDeptManage.deptManage;

/**
 * 부서 관리 Repository 사용자 정의 구현(QueryDSL 검색)
 */
@RequiredArgsConstructor
public class DeptManageRepositoryImpl implements DeptManageRepositoryCustom {
    private record ParentLinkRow(String ognzId, String upOgnzId) implements ParentLink {
        @Override public String getOgnzId() { return ognzId; }
        @Override public String getUpOgnzId() { return upOgnzId; }
    }

    private final jakarta.persistence.EntityManager entityManager;
    private final nuri.foundation.core.persistence.VendorSqlDialect vendorSql;

    private final JPAQueryFactory queryFactory;

    @Override
    public java.util.List<ParentLink> findParentLinksForUpdate() {
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> rows = entityManager.createNativeQuery(vendorSql.selectForLock("ognz_id, up_ognz_id",
                "tb_ognz_info", "ORDER BY ognz_id",
                nuri.foundation.core.persistence.VendorSqlDialect.RowLock.FOR_NO_KEY_UPDATE)).getResultList();
        return rows.stream().<ParentLink>map(row -> new ParentLinkRow((String) row[0], (String) row[1])).toList();
    }

    @Override
    public Page<DeptManage> searchDeptManages(String keyword, Pageable pageable) {
        JPAQuery<DeptManage> query = queryFactory
                .selectFrom(deptManage)
                .where(keywordContains(keyword))
                .orderBy(deptManage.sortOrdr.asc().nullsLast(), deptManage.ognzNm.asc());

        if (pageable.isPaged()) {
            query.offset(pageable.getOffset()).limit(pageable.getPageSize());
        }
        List<DeptManage> content = query.fetch();
        if (pageable.isUnpaged()) {
            return new PageImpl<>(content);
        }

        long total = queryFactory
                .select(deptManage.count())
                .from(deptManage)
                .where(keywordContains(keyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression keywordContains(String keyword) {
        return StringUtils.hasText(keyword) ? deptManage.ognzNm.containsIgnoreCase(keyword) : null;
    }
}
