package com.company.project.service.adb;

import com.company.project.service.adb.dto.AddressBookDto;
import com.company.project.service.adb.dto.AddressBookUserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AddressBookService {
    
    Page<AddressBookDto> getAddressBookList(String wrterId, String trgetOrgnztId, String searchCnd, String searchWrd, Pageable pageable);
    
    AddressBookDto getAddressBook(String adbkId);
    
    void createAddressBook(String userId, AddressBookDto addressBookDto);
    
    void updateAddressBook(String userId, AddressBookDto addressBookDto);
    
    void deleteAddressBook(String adbkId, String userId);
    
    Page<AddressBookUserDto> searchUsers(String searchWrd, Pageable pageable);
    
    AddressBookUserDto getAdbkUser(String id);
}
