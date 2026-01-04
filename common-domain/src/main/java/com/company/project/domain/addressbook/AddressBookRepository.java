package com.company.project.domain.addressbook;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 주소록 Repository
 */
public interface AddressBookRepository extends JpaRepository<AddressBook, String> {

    Page<AddressBook> findByAdbkNmContaining(String adbkNm, Pageable pageable);

    Page<AddressBook> findByWrterId(String wrterId, Pageable pageable);

    List<AddressBook> findByUseAt(String useAt);
}
