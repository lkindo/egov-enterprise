package nuri.business.domain.code;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.code.QCommonCodeCategory.commonCodeCategory;
import static nuri.business.domain.code.QCommonCodeGroup.commonCodeGroup;

@RequiredArgsConstructor
public class CommonCodeGroupRepositoryImpl implements CommonCodeGroupRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<CommonCodeGroupProjection> searchCommonCodeGroups(String searchCondition, String searchKeyword,
            @NonNull Pageable pageable) {
        List<CommonCodeGroupProjection> content = queryFactory
                .select(Projections.constructor(CommonCodeGroupProjection.class,
                        commonCodeGroup.cdId,
                        commonCodeGroup.cdIdNm,
                        commonCodeGroup.cdIdExpln,
                        commonCodeGroup.clsfCd,
                        commonCodeCategory.clsfCdNm,
                        commonCodeGroup.useYn))
                .from(commonCodeGroup)
                .join(commonCodeCategory).on(commonCodeGroup.clsfCd.eq(commonCodeCategory.clsfCd))
                .where(
                        commonCodeCategory.useYn.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(commonCodeGroup.count())
                .from(commonCodeGroup)
                .join(commonCodeCategory).on(commonCodeGroup.clsfCd.eq(commonCodeCategory.clsfCd))
                .where(
                        commonCodeCategory.useYn.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return commonCodeGroup.cdId.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return commonCodeGroup.cdIdNm.contains(searchKeyword);
        }

        return null;
    }
}
