package nuri.business.domain.addressbook;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AddressBookRepositoryCustom {
    Page<AddressBook> searchAddressBooks(String userId, String ognzId, String searchCondition, String searchKeyword,
            Pageable pageable);

    Page<AddressBookUserSearchResult> searchAddressBookUserSelections(String searchKeyword, Pageable pageable);

    // Deprecated external contract: retirement waits for consumer confirmation.
    Page<AddressBookUserSearchResult> searchAddressBookUsers(String searchKeyword, Pageable pageable);
}
