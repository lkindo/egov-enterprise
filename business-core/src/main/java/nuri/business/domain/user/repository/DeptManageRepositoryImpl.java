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
 * ??????? Repository Custom ?????
 */
@RequiredArgsConstructor
public class DeptManageRepositoryImpl implements DeptManageRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<DeptManage> searchDeptManages(String keyword, Pageable pageable) {
        JPAQuery<DeptManage> query = queryFactory
                .selectFrom(deptManage)
                .where(keywordContains(keyword))
                .orderBy(deptManage.ognzNm.asc());

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
