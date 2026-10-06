package nuri.business.domain.addressbook;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AddressBookRepository extends JpaRepository<AddressBook, Long>, AddressBookRepositoryCustom {
    /** 상태 토큰 검사부터 구성원 변경 커밋까지 주소록의 모든 수정·사용중지를 직렬화한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AddressBook a where a.adbkSn = :adbkSn")
    Optional<AddressBook> findByIdForUpdate(@Param("adbkSn") Long adbkSn);

    // [V2_12 결속] 사용자 삭제 시 주소록 작성자를 시스템 계정으로 재귀속 — 콘텐츠 보존 정책
    // (fk_tb_adbk_manage_tb_user_info NO ACTION 하에서 작성자 행 삭제 전 필수)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE AddressBook a SET a.wrterId = :newWrterId WHERE a.wrterId IN :wrterIds")
    int reassignWriterByWrterIdIn(@Param("wrterIds") List<String> wrterIds,
            @Param("newWrterId") String newWrterId);
}
