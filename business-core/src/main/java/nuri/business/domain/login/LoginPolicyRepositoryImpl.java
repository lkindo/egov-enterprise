package nuri.business.domain.login;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static nuri.business.domain.login.QLoginPolicy.loginPolicy;
import static nuri.business.domain.user.entity.QUser.user;

@RequiredArgsConstructor
public class LoginPolicyRepositoryImpl implements LoginPolicyRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<LoginPolicySearchResult> searchLoginPolicies(String searchKeyword, Pageable pageable) {
        List<LoginPolicySearchResult> results = queryFactory
                .select(Projections.fields(LoginPolicySearchResult.class,
                        user.userId,
                        user.userNm,
                        loginPolicy.ipAddr,
                        loginPolicy.dpcnPrmYn,
                        loginPolicy.lmtYn,
                        loginPolicy.bgngTm,
                        loginPolicy.endTm,
                        Expressions.stringTemplate("CASE WHEN {0} IS NULL THEN 'N' ELSE 'Y' END", loginPolicy.userId)
                                .as("regYn")))
                .from(user)
                .leftJoin(loginPolicy).on(user.userId.eq(loginPolicy.userId))
                .where(userNmLike(searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(user.userId.asc())
                .fetch();

        Long total = queryFactory
                .select(user.count())
                .from(user)
                .leftJoin(loginPolicy).on(user.userId.eq(loginPolicy.userId))
                .where(userNmLike(searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(results), pageable, total != null ? total : 0L);
    }

    private com.querydsl.core.types.dsl.BooleanExpression userNmLike(String searchKeyword) {
        return StringUtils.hasText(searchKeyword) ? user.userNm.contains(searchKeyword) : null;
    }
}
