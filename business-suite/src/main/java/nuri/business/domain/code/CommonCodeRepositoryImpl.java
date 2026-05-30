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
import static nuri.business.domain.code.QCommonCode.commonCode;
import static nuri.business.domain.code.QCommonCodeGroup.commonCodeGroup;

@RequiredArgsConstructor
public class CommonCodeRepositoryImpl implements CommonCodeRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<CommonCodeDetailProjection> searchCommonCodeDetails(String searchCondition, String searchKeyword,
            @NonNull Pageable pageable) {
        List<CommonCodeDetailProjection> content = queryFactory
                .select(Projections.constructor(CommonCodeDetailProjection.class,
                        commonCode.cdId,
                        commonCodeGroup.cdIdNm,
                        commonCode.dtlCd,
                        commonCode.dtlCdNm,
                        commonCode.dtlCdExpln,
                        commonCode.useYn))
                .from(commonCode)
                .join(commonCodeGroup).on(commonCode.cdId.eq(commonCodeGroup.cdId))
                .where(
                        commonCodeGroup.useYn.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(commonCode.count())
                .from(commonCode)
                .join(commonCodeGroup).on(commonCode.cdId.eq(commonCodeGroup.cdId))
                .where(
                        commonCodeGroup.useYn.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return commonCode.cdId.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return commonCode.dtlCd.contains(searchKeyword);
        } else if ("3".equals(searchCondition)) {
            return commonCode.dtlCdNm.contains(searchKeyword);
        }

        return null;
    }
}
