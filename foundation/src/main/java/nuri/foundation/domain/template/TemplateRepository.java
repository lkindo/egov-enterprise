package nuri.foundation.domain.template;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * ??쀫탣??Repository
 */
@Repository("commonTemplateRepository")
public interface TemplateRepository extends JpaRepository<Template, String> {

    Page<Template> findByTmplatNmContaining(String tmplatNm, Pageable pageable);

    Page<Template> findByTmplatSeCode(String tmplatSeCode, Pageable pageable);

    List<Template> findByUseAt(String useAt);

    List<Template> findByTmplatSeCodeAndUseAt(String tmplatSeCode, String useAt);
}
