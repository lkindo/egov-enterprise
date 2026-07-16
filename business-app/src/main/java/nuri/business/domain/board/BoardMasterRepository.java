package nuri.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;
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

    List<BoardMaster> findByCmntyIdAndUseYn(String cmntyId, String useYn);
}
