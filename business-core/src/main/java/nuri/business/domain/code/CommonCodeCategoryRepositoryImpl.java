package nuri.business.domain.code;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.code.QCommonCodeCategory.commonCodeCategory;

@RequiredArgsConstructor
public class CommonCodeCategoryRepositoryImpl implements CommonCodeCategoryRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<CommonCodeCategory> searchCommonCodeCategories(String searchCondition, String searchKeyword,
            Pageable pageable) {
        List<CommonCodeCategory> content = queryFactory
                .selectFrom(commonCodeCategory)
                .where(
                        conditionEq(searchCondition, searchKeyword))
                .orderBy(commonCodeCategory.clsfCd.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(commonCodeCategory.count())
                .from(commonCodeCategory)
                .where(
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return commonCodeCategory.clsfCd.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return commonCodeCategory.clsfCdNm.contains(searchKeyword);
        }

        return null;
    }
}
