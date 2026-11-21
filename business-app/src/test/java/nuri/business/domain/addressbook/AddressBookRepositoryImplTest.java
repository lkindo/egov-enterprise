package nuri.business.domain.addressbook;

import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("AddressBookRepositoryImpl 단위 테스트")
class AddressBookRepositoryImplTest {

    @Mock
    private JPAQueryFactory queryFactory;

    @InjectMocks
    private AddressBookRepositoryImpl repository;

    @Test
    @DisplayName("직접 호출도 빈 검색어로 전체 사용자를 조회하지 않음")
    void searchAddressBookUserSelections_RejectsBlankKeyword() {
        Page<AddressBookUserSearchResult> result =
                repository.searchAddressBookUserSelections(" \t ", PageRequest.of(0, 20));

        assertThat(result).isEmpty();
        verifyNoInteractions(queryFactory);
    }

    @Test
    @DisplayName("searchCnd 가 null·빈 문자열이면 주소록명(adbkNm) 검색으로 기본 분기한다")
    void searchAddressBooks_defaultsBlankSearchCndToAddressBookName() {
        @SuppressWarnings("unchecked")
        com.querydsl.jpa.impl.JPAQuery<AddressBook> contentQuery = org.mockito.Mockito.mock(com.querydsl.jpa.impl.JPAQuery.class);
        @SuppressWarnings("unchecked")
        com.querydsl.jpa.impl.JPAQuery<Long> countQuery = org.mockito.Mockito.mock(com.querydsl.jpa.impl.JPAQuery.class);
        org.mockito.Mockito.when(queryFactory.selectFrom(QAddressBook.addressBook)).thenReturn(contentQuery);
        org.mockito.Mockito.when(contentQuery.where(org.mockito.ArgumentMatchers.any(com.querydsl.core.types.Predicate.class)))
                .thenReturn(contentQuery);
        org.mockito.Mockito.when(contentQuery.offset(0L)).thenReturn(contentQuery);
        org.mockito.Mockito.when(contentQuery.limit(10L)).thenReturn(contentQuery);
        org.mockito.Mockito.when(contentQuery.orderBy(org.mockito.ArgumentMatchers.any(com.querydsl.core.types.OrderSpecifier.class)))
                .thenReturn(contentQuery);
        org.mockito.Mockito.when(contentQuery.fetch()).thenReturn(java.util.List.of());
        org.mockito.Mockito.when(queryFactory.select(QAddressBook.addressBook.count())).thenReturn(countQuery);
        org.mockito.Mockito.when(countQuery.from(QAddressBook.addressBook)).thenReturn(countQuery);
        org.mockito.Mockito.when(countQuery.where(org.mockito.ArgumentMatchers.any(com.querydsl.core.types.Predicate.class)))
                .thenReturn(countQuery);
        org.mockito.Mockito.when(countQuery.fetchOne()).thenReturn(0L);

        repository.searchAddressBooks(null, null, null, "길동", PageRequest.of(0, 10));

        org.mockito.ArgumentCaptor<com.querydsl.core.types.Predicate> predicateCaptor =
                org.mockito.ArgumentCaptor.forClass(com.querydsl.core.types.Predicate.class);
        org.mockito.Mockito.verify(contentQuery).where(predicateCaptor.capture());
        assertThat(predicateCaptor.getValue().toString()).contains("adbkNm").contains("길동");
    }
}
