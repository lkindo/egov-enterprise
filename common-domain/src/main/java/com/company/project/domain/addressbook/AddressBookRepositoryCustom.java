package com.company.project.domain.addressbook;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AddressBookRepositoryCustom {
    Page<AddressBook> searchAddressBooks(String userId, String orgnztId, String searchCondition, String searchKeyword, Pageable pageable);
    
    // MyBatis selectManList 대체
    Page<AddressBookUserSearchResult> searchAddressBookUsers(String searchKeyword, Pageable pageable);
}
