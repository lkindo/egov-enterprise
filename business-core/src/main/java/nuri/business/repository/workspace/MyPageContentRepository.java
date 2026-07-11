package nuri.business.repository.workspace;

import nuri.business.domain.mypage.MyPageContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MyPageContentRepository extends JpaRepository<MyPageContent, String> {
    List<MyPageContent> findByCntntsUseYn(String cntntsUseYn);

}
