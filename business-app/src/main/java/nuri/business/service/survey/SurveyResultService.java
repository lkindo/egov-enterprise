package nuri.business.service.survey;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.survey.*;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.survey.dto.SurveyResponseSubmitDto;
import nuri.business.service.survey.dto.SurveyResultDto;
import nuri.business.service.survey.dto.SurveyStatsDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
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

    public SurveyResultDto getResponse(Long srvyRspnsSn) {
        return resultRepository.findById(Objects.requireNonNull(srvyRspnsSn))
                .map(SurveyResultDto::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void deleteResponse(Long srvyRspnsSn) {
        if (!resultRepository.existsById(Objects.requireNonNull(srvyRspnsSn))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        resultRepository.deleteById(srvyRspnsSn);
    }

    /**
     * 설문 응답 제출. 답변 N건이 행 N개가 된다.
     *
     * <p><b>중복 제출 방어는 두 겹이다.</b>
     * <ol>
     *   <li>여기 {@code existsBySrvySnAndFrstRgtrId} — 비동시 재제출을 막는다.</li>
     *   <li>{@code V2_44} 의 {@code uk_tb_srvy_rslt_answer}
     *       ({@code srvy_id, srvy_qstn_id, srvy_artcl_id, frst_rgtr_id}) — 동일 답변 행의 중복을
     *       DB 가 막는다.</li>
     * </ol>
     *
     * <p><b>⚠ 종전 주석이 "근본 해결은 {@code (srvy_id, frst_rgtr_id)} 유니크 인덱스" 라고
     * 적었는데 그것은 틀렸다.</b> 제출 1회가 답변 수만큼 행을 만들고 그 행들이 전부 같은
     * {@code srvy_id}·{@code frst_rgtr_id} 를 가지므로, 그 조합에 UNIQUE 를 걸면 <b>정상 제출의
     * 2번째 답변부터 거부된다</b>. 온라인 투표(V2_4)는 1인 1행이라 통했을 뿐이다.
     *
     * <p><b>아직 닫히지 않은 것</b>: 두 요청이 동시에 1)을 통과한 뒤 <b>서로 다른 항목</b>을 고르면
     * 두 벌의 응답이 함께 남는다. 완전한 보장은 "이 사용자가 이 설문에 응답했다" 를 담는 단일
     * 앵커 행이 필요하며(예: 제출 시 {@code tb_srvy_rspdnt} 행 생성 + 거기에 UNIQUE), 그것은
     * 응답자 테이블의 성격(PII 보유)과 제출 의미론을 함께 정해야 하는 제품 결정이다.
     */
    @Transactional
    public int submitResponse(Long srvySn, SurveyResponseSubmitDto dto) {
        Objects.requireNonNull(srvySn);
        SurveyInfo survey = infoRepository.findById(srvySn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertWithinPeriod(survey);

        String submitter = SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new BusinessException("로그인이 필요합니다.", CommonErrorCode.UNAUTHORIZED));
        if (resultRepository.existsBySrvySnAndFrstRgtrId(srvySn, submitter)) {
            throw new BusinessException("이미 응답한 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        // 제출된 문항·항목이 정말 이 설문의 것인지 확인한다. 확인하지 않으면 다른 설문의
        // 항목 ID 를 실어 보내 통계를 오염시킬 수 있다.
        Map<Long, SurveyQuestion> questions = questionRepository.findBySrvySnOrderByQstnSnAsc(srvySn).stream()
                .collect(Collectors.toMap(SurveyQuestion::getSrvyQstnSn, Function.identity()));
        Map<Long, SurveyArticle> articles = articleRepository
                .findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(questions.keySet()).stream()
                .collect(Collectors.toMap(SurveyArticle::getSrvyArtclSn, Function.identity()));

        List<SurveyResult> rows = new ArrayList<>();
        for (SurveyResponseSubmitDto.Answer a : dto.answers()) {
            SurveyQuestion q = questions.get(a.srvyQstnSn());
            if (q == null) {
                throw new BusinessException("해당 설문의 문항이 아닙니다: " + a.srvyQstnSn(),
                        CommonErrorCode.INVALID_INPUT_VALUE);
            }
            SurveyArticle artcl = articles.get(a.srvyArtclSn());
            if (artcl == null || !q.getSrvyQstnSn().equals(artcl.getSrvyQstnSn())) {
                throw new BusinessException("해당 문항의 항목이 아닙니다: " + a.srvyArtclSn(),
                        CommonErrorCode.INVALID_INPUT_VALUE);
            }
            rows.add(SurveyResult.builder()
                    .srvySn(srvySn)
                    .srvyTmpltSn(q.getSrvyTmpltSn())
                    .srvyQstnSn(a.srvyQstnSn())
                    .srvyArtclSn(a.srvyArtclSn())
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
     * 설문 기간 밖의 응답을 막는다.
     *
     * <p>[2026-09-05] 종전에는 존재·중복만 검사해 <b>종료된 설문·시작 전 설문에도 응답이 저장</b>됐고
     * 통계가 오염됐다. 등록·수정은 {@code validateSurveyDates} 로 기간을 검사하면서 제출은 기간을 보지
     * 않았고, 같은 도메인의 투표({@code OnlinePollService.vote})는 시작 전·종료 후를 막고 있었다.
     *
     * <p>경계가 비어 있으면 그쪽은 열려 있다(시작일 없음 = 즉시, 종료일 없음 = 무기한). 값이 있는데
     * 8자리 날짜가 아니면 판정 불가이므로 <b>열지 않는다</b> — 화면의 {@code survey-status} 판정과 같다.
     */
    private void assertWithinPeriod(SurveyInfo survey) {
        String today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
                .format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        String begin = normalizeStorageYmd(survey.getSrvyBgngYmd());
        String end = normalizeStorageYmd(survey.getSrvyEndYmd());
        if (begin != null && today.compareTo(begin) < 0) {
            throw new BusinessException("아직 시작되지 않은 설문입니다. " + displayYmd(begin) + "부터 응답할 수 있습니다.",
                    CommonErrorCode.INVALID_STATE);
        }
        if (end != null && today.compareTo(end) > 0) {
            throw new BusinessException("이미 종료된 설문입니다. (" + displayYmd(end) + " 종료)",
                    CommonErrorCode.INVALID_STATE);
        }
    }

    private static String normalizeStorageYmd(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String digits = value.replace("-", "").trim();
        if (!digits.matches("\\d{8}")) {
            throw new BusinessException("설문 기간 정보를 확인할 수 없어 응답할 수 없습니다.",
                    CommonErrorCode.INVALID_STATE);
        }
        return digits;
    }

    private static String displayYmd(String ymd) {
        return ymd.substring(0, 4) + "-" + ymd.substring(4, 6) + "-" + ymd.substring(6, 8);
    }

    /**
     * 문항별 항목 응답 분포.
     *
     * <p>응답이 0건인 항목도 0% 행으로 내보낸다 — 화면이 "아무도 고르지 않은 선택지" 를
     * 보여줘야 분포를 읽을 수 있기 때문이다. 집계는 group by 1회로 끝내고(N+1 회피),
     * 비율은 <b>문항 단위 합계</b>로 나눈다(설문 전체가 아니다 — 문항마다 응답 수가 다르다).
     */
    public List<SurveyStatsDto> getStats(Long srvySn) {
        Objects.requireNonNull(srvySn);
        if (!infoRepository.existsById(srvySn)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }

        List<SurveyQuestion> questions = questionRepository.findBySrvySnOrderByQstnSnAsc(srvySn);
        if (questions.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> countByArticle = resultRepository.countGroupedByArticle(srvySn).stream()
                .collect(Collectors.toMap(SurveyResultRepository.ArticleCount::getSrvyArtclSn,
                        SurveyResultRepository.ArticleCount::getCnt));

        Map<Long, List<SurveyArticle>> articlesByQuestion = articleRepository
                .findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(
                        questions.stream().map(SurveyQuestion::getSrvyQstnSn).toList())
                .stream()
                .collect(Collectors.groupingBy(SurveyArticle::getSrvyQstnSn, LinkedHashMap::new, Collectors.toList()));

        List<SurveyStatsDto> stats = new ArrayList<>();
        for (SurveyQuestion q : questions) {
            List<SurveyArticle> articles = articlesByQuestion.getOrDefault(q.getSrvyQstnSn(), List.of());
            long questionTotal = articles.stream()
                    .mapToLong(a -> countByArticle.getOrDefault(a.getSrvyArtclSn(), 0L))
                    .sum();
            for (SurveyArticle a : articles) {
                long count = countByArticle.getOrDefault(a.getSrvyArtclSn(), 0L);
                stats.add(SurveyStatsDto.builder()
                        .srvyQstnSn(q.getSrvyQstnSn())
                        .qstnCn(q.getQstnCn())
                        .qstnTypeCd(q.getQstnTypeCd())
                        .srvyArtclSn(a.getSrvyArtclSn())
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
