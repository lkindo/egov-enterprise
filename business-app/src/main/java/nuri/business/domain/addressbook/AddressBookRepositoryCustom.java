package nuri.business.domain.addressbook;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AddressBookRepositoryCustom {
    Page<AddressBook> searchAddressBooks(String userId, String ognzId, String searchCondition, String searchKeyword,
            Pageable pageable);

    /** 활성 사용자의 내부 키·로그인 ID·성명·부서명만 싣는다. 연락처는 싣지 않는다. */
    Page<AddressBookUserSearchResult> searchAddressBookUserSelections(String searchKeyword, Pageable pageable);
}
