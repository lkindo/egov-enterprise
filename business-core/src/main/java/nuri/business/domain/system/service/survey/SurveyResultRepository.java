package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SurveyResultRepository extends JpaRepository<SurveyResult, String> {
    long countBySrvyArtclId(String srvyArtclId);

    // [V2_13 결속] 설문/문항/항목 삭제 시 응답 선정리용 파생 삭제
    void deleteBySrvyId(String srvyId);

    void deleteBySrvyQstnId(String srvyQstnId);

    void deleteBySrvyArtclId(String srvyArtclId);
}
