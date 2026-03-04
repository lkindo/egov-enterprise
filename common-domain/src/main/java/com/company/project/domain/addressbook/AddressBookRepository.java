package com.company.project.domain.addressbook;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AddressBookRepository extends JpaRepository<AddressBook, String>, AddressBookRepositoryCustom {
    List<AddressBook> findByUseAt(String useAt);

    Page<AddressBook> findByWrterId(String wrterId, Pageable pageable);

    Page<AddressBook> findByAdbkNmContaining(String adbkNm, Pageable pageable);
}