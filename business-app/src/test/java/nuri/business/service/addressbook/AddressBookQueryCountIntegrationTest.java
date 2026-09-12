package nuri.business.service.addressbook;

import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.support.BusinessIntegrationTestSupport;
import nuri.business.core.harness.QueryCountGuard;
import nuri.business.core.harness.QueryCountInspector;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 주소록 등록·조회의 **쿼리 수 상한**(N+1 회귀 방어).
 *
 * ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
 * 종전에는 이 단언이 `QueryCountGuardrailIntegrationTest` 안에 있었다. 그 파일의 목적은
 * **계측 인프라 검증**인데 표적이 주소록이라, `AddressBookService` 타입 참조 한 줄 때문에
 * 재사용 base 축소 프로필에서 **계측 가드레일까지 통째로 연쇄 제거**됐다(GAP-PACK-001 ④).
 *
 * 둘은 성격이 다르므로 나눈다.
 *   - 계측이 동작하는가 → core 도메인 표적, 모든 프로필에 남는다.
 *   - **주소록의** 쿼리 수 상한 → 주소록이 있는 프로필에만 있으면 된다.
 *
 * ⚠ 그래서 이 파일이 demo 프로필 밖에서 사라지는 것은 결함이 아니라 **정확한 동작**이다 —
 *   도메인이 없으면 그 도메인의 상한도 없다. 생성기의 제거 승인 목록에 남는 기록도 참말이 된다.
 */
class AddressBookQueryCountIntegrationTest extends BusinessIntegrationTestSupport {

    @Autowired
    private AddressBookService addressBookService;

    @Test
    @DisplayName("주소록 등록·조회가 쿼리 상한(15) 안에서 끝난다")
    @QueryCountGuard(max = 15)
    void addressBookCreateAndList_staysWithinQueryBudget() {
        // given
        String userId = "harnessUser";
        AddressBookDto saveRequest = AddressBookDto.builder()
                .adbkNm("Harness Test Book")
                .rlsScopeCd("P")
                .useYn("Y")
                .adbkMan(Collections.emptyList())
                .build();

        // when
        addressBookService.createAddressBook(userId, saveRequest);
        addressBookService.getAddressBookList(userId, null, null, "Harness", PageRequest.of(0, 10));

        // then
        int currentCount = QueryCountInspector.getCount();
        assertThat(currentCount).isGreaterThan(0);
        assertThat(currentCount).isLessThanOrEqualTo(15);
    }
}
