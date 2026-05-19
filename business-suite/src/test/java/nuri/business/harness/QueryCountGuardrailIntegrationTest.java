package nuri.business.harness;

import nuri.business.service.addressbook.AddressBookService;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.support.BusinessIntegrationTestSupport;
import nuri.foundation.core.harness.QueryCountGuard;
import nuri.foundation.core.harness.QueryCountInspector;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JPA 성능 가드레일(QueryCountGuard) 연동 및 오동작 방지 최종 통합 검증 테스트
 */
class QueryCountGuardrailIntegrationTest extends BusinessIntegrationTestSupport {

    @Autowired
    private AddressBookService addressBookService;

    @Test
    @DisplayName("JPA 성능 가드레일 - 정상 범위 쿼리 실행 검증")
    @QueryCountGuard(max = 15)
    void queryCountGuardrail_successWithinLimit() {
        // given
        String userId = "harnessUser";
        AddressBookDto saveRequest = AddressBookDto.builder()
                .adbkNm("Harness Test Book")
                .othbcScope("P")
                .useYn("Y")
                .adbkMan(Collections.emptyList())
                .build();

        // when
        addressBookService.createAddressBook(userId, saveRequest);
        addressBookService.getAddressBookList(userId, null, null, "Harness", PageRequest.of(0, 10));

        // then
        int currentCount = QueryCountInspector.getCount();
        System.out.println("=================================================");
        System.out.println("Executed SQL Query Count: " + currentCount);
        System.out.println("=================================================");
        
        assertThat(currentCount).isGreaterThan(0);
        assertThat(currentCount).isLessThanOrEqualTo(15);
    }
}
