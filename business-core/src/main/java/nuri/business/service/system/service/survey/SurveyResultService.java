package nuri.business.service.system.service.survey;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.system.service.survey.*;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.system.service.survey.dto.SurveyResponseSubmitDto;
import nuri.business.service.system.service.survey.dto.SurveyResultDto;
import nuri.business.service.system.service.survey.dto.SurveyStatsDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.util.IdGenerationUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 설문 응답(`tb_srvy_rslt`) 서비스.
 *
 * <p>[D-4 3단계] 이 테이블을 쓰는 계층이 통째로 없었다. {@code SurveyService} 는
 * {@code SurveyResultRepository} 를 <b>설문 삭제 시 연쇄 정리용으로만</b> 주입하고 있었고,
 * 응답을 적재하거나 집계하는 코드는 어디에도 없었다. 즉 설문을 만들 수는 있어도
 * <b>답할 수는 없는 상태</b>였다(실측 2026-08-05: `tb_srvy_rslt` 0행, `tb_srvy_rspdnt` 0행).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyResultService {

    private final SurveyResultRepository resultRepository;
    private final SurveyQuestionRepository questionRepository;
    private final SurveyArticleRepository articleRepository;
    private final SurveyInfoRepository infoRepository;

    /** 응답 목록(관리). 응답자명 부분일치. */
    public Page<SurveyResultDto> getResponseList(String keyword, Pageable pageable) {
        return resultRepository.searchByRspnsNm(keyword == null ? "" : keyword, pageable)
                .map(SurveyResultDto::from);
    }

    public SurveyResultDto getResponse(String srvyRspnsId) {
        return resultRepository.findById(Objects.requireNonNull(srvyRspnsId))
                .map(SurveyResultDto::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void deleteResponse(String srvyRspnsId) {
        if (!resultRepository.existsById(Objects.requireNonNull(srvyRspnsId))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        resultRepository.deleteById(srvyRspnsId);
    }

    /**
     * 설문 응답 제출. 답변 N건이 행 N개가 된다.
     *
     * <p><b>중복 제출은 애플리케이션 레벨에서 막는다.</b> 물리 스키마에 유니크 제약이 없어
     * (온라인 투표 {@code tb_onln_poll_rslt} 는 {@code V2_4} 로 유니크가 있지만 설문에는 없다)
     * DB 가 이를 보장하지 못한다. 제약 추가는 스키마 변경이라 별도 승인이 필요하므로,
     * 우선 서비스에서 차단하고 <b>동시 요청에는 취약함을 명시</b>한다 — 두 요청이 동시에
     * 통과하면 중복 행이 생긴다. 근본 해결은 {@code (srvy_id, frst_rgtr_id)} 유니크 인덱스다.
     */
    @Transactional
    public int submitResponse(String srvyId, SurveyResponseSubmitDto dto) {
        Objects.requireNonNull(srvyId);
        if (!infoRepository.existsById(srvyId)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }

        String submitter = SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new BusinessException("로그인이 필요합니다.", CommonErrorCode.UNAUTHORIZED));
        if (resultRepository.existsBySrvyIdAndFrstRgtrId(srvyId, submitter)) {
            throw new BusinessException("이미 응답한 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        // 제출된 문항·항목이 정말 이 설문의 것인지 확인한다. 확인하지 않으면 다른 설문의
        // 항목 ID 를 실어 보내 통계를 오염시킬 수 있다.
        Map<String, SurveyQuestion> questions = questionRepository.findBySrvyIdOrderByQstnSnAsc(srvyId).stream()
                .collect(Collectors.toMap(SurveyQuestion::getSrvyQstnId, Function.identity()));
        Map<String, SurveyArticle> articles = articleRepository
                .findBySrvyQstnIdInOrderBySrvyQstnIdAscArtclSnAsc(questions.keySet()).stream()
                .collect(Collectors.toMap(SurveyArticle::getSrvyArtclId, Function.identity()));

        List<SurveyResult> rows = new ArrayList<>();
        for (SurveyResponseSubmitDto.Answer a : dto.answers()) {
            SurveyQuestion q = questions.get(a.srvyQstnId());
            if (q == null) {
                throw new BusinessException("해당 설문의 문항이 아닙니다: " + a.srvyQstnId(),
                        CommonErrorCode.INVALID_INPUT_VALUE);
            }
            SurveyArticle artcl = articles.get(a.srvyArtclId());
            if (artcl == null || !q.getSrvyQstnId().equals(artcl.getSrvyQstnId())) {
                throw new BusinessException("해당 문항의 항목이 아닙니다: " + a.srvyArtclId(),
                        CommonErrorCode.INVALID_INPUT_VALUE);
            }
            rows.add(SurveyResult.builder()
                    .srvyRspnsId(IdGenerationUtil.generateId("SRSP_", 15))
                    .srvyId(srvyId)
                    .srvyTmpltId(q.getSrvyTmpltId())
                    .srvyQstnId(a.srvyQstnId())
                    .srvyArtclId(a.srvyArtclId())
                    .rspdntAnsCn(a.rspdntAnsCn())
                    .rspnsNm(dto.rspnsNm())
                    .etcAnsCn(a.etcAnsCn())
                    .build());
        }
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 채운다 — 위 중복 검사와 같은 값이어야 한다.
        resultRepository.saveAll(rows);
        return rows.size();
    }

    /**
     * 문항별 항목 응답 분포.
     *
     * <p>응답이 0건인 항목도 0% 행으로 내보낸다 — 화면이 "아무도 고르지 않은 선택지" 를
     * 보여줘야 분포를 읽을 수 있기 때문이다. 집계는 group by 1회로 끝내고(N+1 회피),
     * 비율은 <b>문항 단위 합계</b>로 나눈다(설문 전체가 아니다 — 문항마다 응답 수가 다르다).
     */
    public List<SurveyStatsDto> getStats(String srvyId) {
        Objects.requireNonNull(srvyId);
        if (!infoRepository.existsById(srvyId)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }

        List<SurveyQuestion> questions = questionRepository.findBySrvyIdOrderByQstnSnAsc(srvyId);
        if (questions.isEmpty()) {
            return List.of();
        }
        Map<String, Long> countByArticle = resultRepository.countGroupedByArticle(srvyId).stream()
                .collect(Collectors.toMap(SurveyResultRepository.ArticleCount::getSrvyArtclId,
                        SurveyResultRepository.ArticleCount::getCnt));

        Map<String, List<SurveyArticle>> articlesByQuestion = articleRepository
                .findBySrvyQstnIdInOrderBySrvyQstnIdAscArtclSnAsc(
                        questions.stream().map(SurveyQuestion::getSrvyQstnId).toList())
                .stream()
                .collect(Collectors.groupingBy(SurveyArticle::getSrvyQstnId, LinkedHashMap::new, Collectors.toList()));

        List<SurveyStatsDto> stats = new ArrayList<>();
        for (SurveyQuestion q : questions) {
            List<SurveyArticle> articles = articlesByQuestion.getOrDefault(q.getSrvyQstnId(), List.of());
            long questionTotal = articles.stream()
                    .mapToLong(a -> countByArticle.getOrDefault(a.getSrvyArtclId(), 0L))
                    .sum();
            for (SurveyArticle a : articles) {
                long count = countByArticle.getOrDefault(a.getSrvyArtclId(), 0L);
                stats.add(SurveyStatsDto.builder()
                        .srvyQstnId(q.getSrvyQstnId())
                        .qstnCn(q.getQstnCn())
                        .qstnTypeCd(q.getQstnTypeCd())
                        .srvyArtclId(a.getSrvyArtclId())
                        .artclCn(a.getArtclCn())
                        .count(count)
                        .percentage(questionTotal == 0 ? 0.0
                                : Math.round(count * 1000.0 / questionTotal) / 10.0)
                        .build());
            }
        }
        return stats;
    }
}
