package com.company.project.business.domain.addressbook;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AddressBookRepositoryCustom {
    Page<AddressBook> searchAddressBooks(String userId, String orgnztId, String searchCondition, String searchKeyword,
            Pageable pageable);

    // MyBatis selectManList 筌
    Page<AddressBookUserSearchResult> searchAddressBookUsers(String searchKeyword, Pageable pageable);
}
