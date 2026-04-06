package nuri.business.domain.addressbook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AddressBookUserRepository extends JpaRepository<AddressBookUser, String> {
    List<AddressBookUser> findByAdbkId(String adbkId);

    void deleteByAdbkIdAndEmplyrId(String adbkId, String emplyrId);

    void deleteByAdbkId(String adbkId);
}
