package nuri.business.domain.addressbook;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.addressbook.QAddressBook.addressBook;
import static nuri.foundation.domain.user.entity.QUser.user;

@RequiredArgsConstructor
public class AddressBookRepositoryImpl implements AddressBookRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<AddressBook> searchAddressBooks(String userId, String orgnztId, String searchCondition,
                        String searchKeyword, Pageable pageable) {
                BooleanExpression searchPredicate = null;
                if (StringUtils.hasText(searchKeyword)) {
                        if ("0".equals(searchCondition)) {
                                searchPredicate = addressBook.adbkNm.contains(searchKeyword);
                        } else if ("1".equals(searchCondition)) {
                                searchPredicate = addressBook.othbcScope.contains(searchKeyword);
                        } else if ("2".equals(searchCondition)) {
                                searchPredicate = addressBook.wrterId.contains(searchKeyword);
                        }
                }

                var query = queryFactory
                                .selectFrom(addressBook)
                                .where(addressBook.useAt.eq("Y")
                                                .and(addressBook.othbcScope.eq("PUBLIC")
                                                                .or(addressBook.wrterId.eq(userId))
                                                                .or(addressBook.othbcScope.eq("DEPT")
                                                                                .and(orgnztId != null ? addressBook.trgetOrgnztId.eq(orgnztId) : addressBook.trgetOrgnztId.isNull()))),
                                                searchPredicate)
                                .orderBy(addressBook.adbkNm.asc());

                if (pageable.isPaged()) {
                        query.offset(pageable.getOffset()).limit(pageable.getPageSize());
                }

                List<AddressBook> content = query.fetch();

                Long total = queryFactory
                                .select(addressBook.count())
                                .from(addressBook)
                                .where(addressBook.useAt.eq("Y"), searchPredicate)
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                                total != null ? total.longValue() : 0L);
        }

        @Override
        public Page<AddressBookUserSearchResult> searchAddressBookUsers(String searchKeyword,
                        Pageable pageable) {
                // 통합 테이블(nuserinfo)에서 단일 쿼리로 모든 사용자 유형 검색
                BooleanExpression searchPredicate = null;
                if (StringUtils.hasText(searchKeyword)) {
                    searchPredicate = user.userNm.contains(searchKeyword)
                                .or(user.userId.contains(searchKeyword));
                }

                List<AddressBookUserSearchResult> results = queryFactory
                                .select(Projections.fields(AddressBookUserSearchResult.class,
                                                user.userId.as("userId"),
                                                user.userNm.as("nm"),
                                                user.emlAddr,
                                                user.mblTelno))
                                .from(user)
                                .where(searchPredicate)
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long total = queryFactory
                                .select(user.count())
                                .from(user)
                                .where(searchPredicate)
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(results), Objects.requireNonNull(pageable),
                                total != null ? total.longValue() : 0L);
        }
}
