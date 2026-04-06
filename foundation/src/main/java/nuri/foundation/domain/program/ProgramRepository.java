package nuri.foundation.domain.program;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProgramRepository extends JpaRepository<Program, String> {

    @Query("SELECT p FROM Program p WHERE p.progrmKoreanNm LIKE %:searchKeyword% OR p.progrmFileNm LIKE %:searchKeyword%")
    Page<Program> searchByKeyword(@Param("searchKeyword") String searchKeyword, Pageable pageable);

    java.util.Optional<Program> findByUrl(String url);
}
