package nuri.foundation.domain.template;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 템플릿 정보 리포지토리
 */
@Repository("commonTemplateRepository")
public interface TemplateRepository extends JpaRepository<Template, String> {

    Page<Template> findByTmplatNmContaining(String tmplatNm, Pageable pageable);

    Page<Template> findByTmplatSeCode(String tmplatSeCode, Pageable pageable);

    List<Template> findByTmplatSeCode(String tmplatSeCode);

    List<Template> findByUseYn(String useYn);

    List<Template> findByTmplatSeCodeAndUseYn(String tmplatSeCode, String useYn);
}
