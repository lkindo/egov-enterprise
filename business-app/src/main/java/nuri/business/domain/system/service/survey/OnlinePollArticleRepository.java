package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * 온라인 설문 항목 Repository (표준화)
 */
public interface OnlinePollArticleRepository extends JpaRepository<OnlinePollArticle, Long> {
    List<OnlinePollArticle> findByPollManagePollSn(Long pollSn);

    boolean existsByPollArtclSnAndPollManagePollSn(Long pollArtclSn, Long pollSn);
}
