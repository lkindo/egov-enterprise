package nuri.business.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 파일 마스터 JPA Repository
 */
@Repository
public interface FileMasterRepository extends JpaRepository<FileMaster, Long> {
    /** 같은 묶음에 추가하는 요청은 순번 조회부터 상세 저장의 커밋까지 직렬화한다. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT f FROM FileMaster f WHERE f.atchFileSn = :atchFileSn")
    java.util.Optional<FileMaster> findByIdForUpdate(@org.springframework.data.repository.query.Param("atchFileSn") Long atchFileSn);
}
