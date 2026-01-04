package com.company.project.service.addressbook;

import com.company.project.service.addressbook.dto.AddressBookDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 주소록 서비스 인터페이스
 */
public interface EgovAddressBookService {

    Page<AddressBookDto> getAddressBookList(String keyword, Pageable pageable);

    Page<AddressBookDto> getMyAddressBooks(String userId, Pageable pageable);

    AddressBookDto getAddressBook(String adbkId);

    String createAddressBook(String userId, AddressBookDto dto);

    void updateAddressBook(String adbkId, String userId, AddressBookDto dto);

    void deleteAddressBook(String adbkId);

    List<AddressBookDto> getActiveAddressBooks();
}
