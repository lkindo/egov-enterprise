package nuri.business.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 설문 응답자 정보 Repository
 *
 * <p>응답자 API·화면은 DEC-OPS-070 으로 걷혔다. 남은 소비자는 설문 템플릿 변경 가드(existsBySrvySn)와
 * 설문 삭제 시 FK 선정리(deleteBySrvySn)뿐이다.
 */
public interface SurveyRespondentRepository extends JpaRepository<SurveyRespondent, SurveyRespondentId> {

    boolean existsBySrvySn(Long srvySn);

    // [V2_13 결속] 설문 삭제 시 응답자 선정리 (fk_tb_srvy_rspdnt_tb_srvy_info NO ACTION)
    void deleteBySrvySn(Long srvySn);
}
