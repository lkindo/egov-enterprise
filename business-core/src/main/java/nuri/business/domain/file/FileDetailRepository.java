package nuri.business.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 파일 상세 JPA Repository
 */
@Repository
public interface FileDetailRepository extends JpaRepository<FileDetail, java.util.UUID> {
    List<FileDetail> findByFileMaster(FileMaster fileMaster);

    org.springframework.data.domain.Page<FileDetail> findByOrgnlFileNmContaining(String orgnlFileNm,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT fd FROM FileDetail fd WHERE fd.fileMaster.atchFileSn = :atchFileSn AND fd.atchFileSeq = :atchFileSeq")
    java.util.Optional<FileDetail> findByFileMasterAtchFileSnAndAtchFileSeq(
            @org.springframework.data.repository.query.Param("atchFileSn") Long atchFileSn,
            @org.springframework.data.repository.query.Param("atchFileSeq") Integer atchFileSeq);
}
