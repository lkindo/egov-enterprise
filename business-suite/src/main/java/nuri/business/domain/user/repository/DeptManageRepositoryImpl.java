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
import static nuri.business.domain.user.entity.QDeptManage.deptManage;

/**
 * ??????? Repository Custom ?????
 */
@RequiredArgsConstructor
public class DeptManageRepositoryImpl implements DeptManageRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<DeptManage> searchDeptManages(String keyword, Pageable pageable) {
        List<DeptManage> content = queryFactory
                .selectFrom(deptManage)
                .where(keywordContains(keyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(deptManage.ognzNm.asc())
                .fetch();

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
