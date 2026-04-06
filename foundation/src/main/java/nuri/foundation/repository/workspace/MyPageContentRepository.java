package nuri.foundation.repository.workspace;

import nuri.foundation.domain.workspace.MyPageContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MyPageContentRepository extends JpaRepository<MyPageContent, String> {
    List<MyPageContent> findByCntntsUseAt(String cntntsUseAt);
}
