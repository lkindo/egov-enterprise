package nuri.business.domain.addressbook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AddressBookUserRepository extends JpaRepository<AddressBookUser, String> {
    @org.springframework.data.jpa.repository.Query("select u from AddressBookUser u where u.addressBook.adbkId = :adbkId")
    List<AddressBookUser> findByAdbkId(@org.springframework.data.repository.query.Param("adbkId") String adbkId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from AddressBookUser u where u.addressBook.adbkId = :adbkId and u.userId = :userId")
    void deleteByAdbkIdAndUserId(@org.springframework.data.repository.query.Param("adbkId") String adbkId, @org.springframework.data.repository.query.Param("userId") String userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from AddressBookUser u where u.addressBook.adbkId = :adbkId")
    void deleteByAdbkId(@org.springframework.data.repository.query.Param("adbkId") String adbkId);
}
