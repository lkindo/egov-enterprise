package com.company.project.domain.board;

import org.springframework.lang.NonNull;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long>, BoardRepositoryCustom {
        @Override
        @NonNull
        Optional<Board> findById(@NonNull Long id);

        @Override
        @Transactional
        void deleteById(@NonNull Long id);

        @Query("SELECT COALESCE(MAX(b.sortOrdr), 0) FROM Board b WHERE b.bbsId = :bbsId")
        Long findMaxSortOrdr(@Param("bbsId") String bbsId);

        @Query("SELECT COALESCE(MAX(b.nttNo), 0) FROM Board b WHERE b.bbsId = :bbsId AND b.sortOrdr = :sortOrdr")
        Long findMaxNttNo(@Param("bbsId") String bbsId, @Param("sortOrdr") Long sortOrdr);

        @Query("SELECT COALESCE(MAX(b.nttId), 0) FROM Board b")
        Long findMaxNttId();
}