package com.company.project.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

/**
 * 野껊슣???筌띾뜆???JPA Repository
 */

@Repository
public interface BoardMasterRepository extends JpaRepository<BoardMaster, String>, BoardMasterRepositoryCustom {
    @Override
    @NonNull
    Optional<BoardMaster> findById(@NonNull String bbsId);

    @Override
    @Transactional
    void deleteById(@NonNull String bbsId);

    List<BoardMaster> findByCmmntyIdAndUseAt(String cmmntyId, String useAt);
}
