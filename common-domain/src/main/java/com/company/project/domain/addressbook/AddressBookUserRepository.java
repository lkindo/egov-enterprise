package com.company.project.domain.addressbook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AddressBookUserRepository extends JpaRepository<AddressBookUser, String> {
    List<AddressBookUser> findByAdbkId(String adbkId);

    void deleteByAdbkIdAndEmplyrIdAndNcrdId(String adbkId, String emplyrId, String ncrdId);

    void deleteByAdbkId(String adbkId);
}
