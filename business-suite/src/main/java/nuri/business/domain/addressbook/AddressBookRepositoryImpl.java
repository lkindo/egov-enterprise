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
import static nuri.business.domain.addressbook.QAddressBookUser.addressBookUser;
import static nuri.foundation.domain.user.entity.QUser.user;

@RequiredArgsConstructor
public class AddressBookRepositoryImpl implements AddressBookRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<AddressBook> searchAddressBooks(String wrterId, String trgetOrgnztId, String searchCnd, String searchWrd,
            Pageable pageable) {
        BooleanExpression condition = null;
        if (StringUtils.hasText(searchWrd)) {
            if ("0".equals(searchCnd)) {
                condition = addressBook.adbkNm.contains(searchWrd);
            } else if ("1".equals(searchCnd)) {
                condition = addressBook.wrterId.contains(searchWrd);
            }
        }

        List<AddressBook> results = queryFactory
                .selectFrom(addressBook)
                .where(addressBook.useYn.eq("Y")
                        .and(wrterIdEq(wrterId))
                        .and(trgetOrgnztIdEq(trgetOrgnztId))
                        .and(condition))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(addressBook.adbkId.desc())
                .fetch();

        Long total = queryFactory
                .select(addressBook.count())
                .from(addressBook)
                .where(addressBook.useYn.eq("Y")
                        .and(wrterIdEq(wrterId))
                        .and(trgetOrgnztIdEq(trgetOrgnztId))
                        .and(condition))
                .fetchOne();

        return new PageImpl<>(results, pageable, total != null ? total : 0L);
    }

    @Override
    public Page<AddressBookUserSearchResult> searchAddressBookUsers(String searchWrd, Pageable pageable) {
        BooleanExpression searchPredicate = null;
        if (StringUtils.hasText(searchWrd)) {
            searchPredicate = user.userNm.contains(searchWrd).or(user.userId.contains(searchWrd));
        }

        List<AddressBookUserSearchResult> results = queryFactory
                .select(Projections.fields(AddressBookUserSearchResult.class,
                        user.userId,
                        user.userNm,
                        user.emlAddr,
                        user.mblTelno))
                .from(user)
                .leftJoin(addressBook).on(user.userId.eq(addressBook.wrterId).and(addressBook.useYn.eq("Y")))
                .where(searchPredicate)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(user.count())
                .from(user)
                .leftJoin(addressBook).on(user.userId.eq(addressBook.wrterId).and(addressBook.useYn.eq("Y")))
                .where(searchPredicate)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(results), Objects.requireNonNull(pageable),
                total != null ? total.longValue() : 0L);
    }

    private BooleanExpression wrterIdEq(String wrterId) {
        return StringUtils.hasText(wrterId) ? addressBook.wrterId.eq(wrterId) : null;
    }

    private BooleanExpression trgetOrgnztIdEq(String trgetOrgnztId) {
        return StringUtils.hasText(trgetOrgnztId) ? addressBook.trgetOrgnztId.eq(trgetOrgnztId) : null;
    }
}
