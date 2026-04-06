package nuri.business.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FileItemRepository extends JpaRepository<FileItem, Long> {
    Optional<FileItem> findByFileGroupAndFileSn(FileGroup fileGroup, Integer fileSn);
}
