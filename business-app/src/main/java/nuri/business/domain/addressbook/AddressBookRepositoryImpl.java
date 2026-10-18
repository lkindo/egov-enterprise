package nuri.business.domain.addressbook;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static nuri.business.domain.addressbook.QAddressBook.addressBook;
import static nuri.business.domain.user.entity.QUser.user;
import static nuri.business.domain.organization.QOrganizationManage.organizationManage;

@RequiredArgsConstructor
public class AddressBookRepositoryImpl implements AddressBookRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<AddressBook> searchAddressBooks(String wrterId, String trgetOgnzId, String searchCnd, String searchWrd,
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
                        .and(trgetOgnzIdEq(trgetOgnzId))
                        .and(condition))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(addressBook.adbkSn.desc())
                .fetch();

        Long total = queryFactory
                .select(addressBook.count())
                .from(addressBook)
                .where(addressBook.useYn.eq("Y")
                        .and(wrterIdEq(wrterId))
                        .and(trgetOgnzIdEq(trgetOgnzId))
                        .and(condition))
                .fetchOne();

        return new PageImpl<>(results, pageable, total != null ? total : 0L);
    }

    @Override
    public Page<AddressBookUserSearchResult> searchAddressBookUserSelections(String searchWrd, Pageable pageable) {
        Objects.requireNonNull(pageable);
        Pageable requestedPageable = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 20));
        String normalizedSearchWrd = searchWrd == null ? "" : searchWrd.trim();
        if (normalizedSearchWrd.length() < 2) {
            return Page.empty(requestedPageable);
        }
        BooleanExpression searchPredicate = user.userNm.contains(normalizedSearchWrd)
                .or(user.userId.contains(normalizedSearchWrd))
                .and(user.userSttsCd.eq("P"));

        // [2026-10-18] 연락처(이메일·휴대전화)를 싣던 구 검색 분기를 걷었다 — 이 조회는 연락처를 읽지 않는다.
        var projection = Projections.fields(AddressBookUserSearchResult.class,
                user.esntlId, user.userId, user.userNm, organizationManage.ognzNm);
        List<AddressBookUserSearchResult> results = queryFactory
                .select(projection)
                .from(user)
                .leftJoin(organizationManage).on(user.ognzId.eq(organizationManage.ognzId))
                .where(searchPredicate)
                .offset(requestedPageable.getOffset())
                .limit(Math.min(requestedPageable.getPageSize(), 20))
                .orderBy(user.userNm.asc(), user.esntlId.asc())
                .fetch();

        Long total = queryFactory
                .select(user.count())
                .from(user)
                .where(searchPredicate)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(results), requestedPageable,
                total != null ? total.longValue() : 0L);
    }

    private BooleanExpression wrterIdEq(String wrterId) {
        return StringUtils.hasText(wrterId) ? addressBook.wrterId.eq(wrterId) : null;
    }

    private BooleanExpression trgetOgnzIdEq(String trgetOgnzId) {
        return StringUtils.hasText(trgetOgnzId) ? addressBook.trgetOgnzId.eq(trgetOgnzId) : null;
    }
}
