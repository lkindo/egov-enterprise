package nuri.business.domain.addressbook;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AddressBookRepository extends JpaRepository<AddressBook, String>, AddressBookRepositoryCustom {
    List<AddressBook> findByUseYn(String useYn);

    // legacy
    default List<AddressBook> findByUseAt(String useAt) {
        return findByUseYn(useAt);
    }

    Page<AddressBook> findByWrterId(String wrterId, Pageable pageable);

    Page<AddressBook> findByAdbkNmContaining(String adbkNm, Pageable pageable);

    // [V2_12 결속] 사용자 삭제 시 주소록 작성자를 시스템 계정으로 재귀속 — 콘텐츠 보존 정책
    // (fk_tb_adbk_manage_tb_user_info NO ACTION 하에서 작성자 행 삭제 전 필수)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE AddressBook a SET a.wrterId = :newWrterId WHERE a.wrterId IN :wrterIds")
    int reassignWriterByWrterIdIn(@Param("wrterIds") List<String> wrterIds,
            @Param("newWrterId") String newWrterId);
}
