package nuri.business.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * ???뵬 怨멸쉭 JPA Repository
 */
@Repository
public interface FileDetailRepository extends JpaRepository<FileDetail, FileDetailId> {
    List<FileDetail> findByFileMaster(FileMaster fileMaster);

    org.springframework.data.domain.Page<FileDetail> findByOrignlFileNmContaining(String orignlFileNm,
            org.springframework.data.domain.Pageable pageable);
}
