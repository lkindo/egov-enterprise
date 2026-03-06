package com.company.project.service.addressbook;

import com.company.project.service.addressbook.dto.AddressBookDto;
import com.company.project.service.addressbook.dto.AddressBookUserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AddressBookService {

    Page<AddressBookDto> getAddressBookList(String wrterId, String trgetOrgnztId, String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable);

    AddressBookDto getAddressBook(@org.springframework.lang.NonNull String adbkId);

    void createAddressBook(String userId, AddressBookDto addressBookDto);

    void updateAddressBook(String userId, AddressBookDto addressBookDto);

    void deleteAddressBook(String adbkId, String userId);

    Page<AddressBookUserDto> searchUsers(String searchWrd, @org.springframework.lang.NonNull Pageable pageable);

    AddressBookUserDto getAdbkUser(String id);
}
