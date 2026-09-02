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
    void searchAddressBookUsers_RejectsBlankKeyword() {
        Page<AddressBookUserSearchResult> result =
                repository.searchAddressBookUsers(" \t ", PageRequest.of(0, 20));

        assertThat(result).isEmpty();
        verifyNoInteractions(queryFactory);
    }
}
