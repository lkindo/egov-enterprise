package nuri.business.domain.addressbook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AddressBookUserRepository extends JpaRepository<AddressBookUser, String> {
    @org.springframework.data.jpa.repository.Query("select u from AddressBookUser u where u.addressBook.adbkId = :adbkId")
    List<AddressBookUser> findByAdbkId(@org.springframework.data.repository.query.Param("adbkId") String adbkId);

    // [W1-25 P3① 삭제] deleteByAdbkIdAndUserId / deleteByAdbkId 제거 — 저장소 전역 호출부 0.
    //   AddressBookService.update() 의 삭제는 '새 목록에 없는 사용자만' 지우는 **선택적** 루프라
    //   deleteByAdbkId(전체 삭제)로 대체할 수 없고, 건별 삭제는 이미 delete(entity) 로 수행한다.
    //   즉 배선을 기다리던 더 나은 구현이 아니라 쓰이지 않는 @Modifying 벌크 삭제였다.
    //   ※ 감사 보고서의 'clearAutomatically 누락 1건' 은 실측과 다르다 — 해당 애노테이션이 없는 곳은
    //     4개소이고 그중 3개는 호출부 0, 나머지 1개(UserLogRepository.deleteByDmndUserIdIn)는
    //     같은 트랜잭션에서 UserLog 를 재조회하지 않으므로 무해하다. 4곳에 일괄 부착하는 것은
    //     §0.7-H4 위반이자 실익 0 이라 하지 않았다.
}
