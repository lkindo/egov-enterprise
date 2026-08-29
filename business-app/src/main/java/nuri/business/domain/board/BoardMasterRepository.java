package nuri.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시판 마스터 JPA Repository
 */

@Repository
public interface BoardMasterRepository extends JpaRepository<BoardMaster, String>, BoardMasterRepositoryCustom {
    @Override
    @NonNull
    Optional<BoardMaster> findById(@NonNull String bbsId);

    @Override
    @Transactional
    void deleteById(@NonNull String bbsId);

    /**
     * 게시판 마스터 행을 비관적 쓰기 락으로 조회한다.
     * createPost(sort_ordr)/replyPost(ans_sn) 의 MAX+1 채번을 게시판 단위로 직렬화하여
     * 락 없는 read-modify-write 경합(동시 원글/답글의 순번 중복)을 방지한다.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT m FROM BoardMaster m WHERE m.bbsId = :bbsId")
    Optional<BoardMaster> findByIdWithPessimisticLock(@org.springframework.data.repository.query.Param("bbsId") String bbsId);

    /**
     * 일괄 영구 삭제 대상과 자식 옵션을 한 번에 읽는다.
     *
     * <p>{@code BoardMaster.option} 은 orphanRemoval/cascade 대상이면서 DB FK가 마스터를 참조한다.
     * 옵션을 미리 fetch하지 않은 채 엔티티별 삭제를 수행하면 삭제 cascade 시 옵션 조회가 N+1로
     * 다시 발생할 수 있으므로, 상태 변경과 영구 삭제가 공통으로 사용하는 배치 조회 경계에서 함께 적재한다.
     */
    @Query("SELECT DISTINCT m FROM BoardMaster m LEFT JOIN FETCH m.option WHERE m.bbsId IN :bbsIds")
    List<BoardMaster> findAllWithOptionByBbsIdIn(@Param("bbsIds") List<String> bbsIds);

    List<BoardMaster> findByCmntySnAndUseYn(Long cmntySn, String useYn);
}
