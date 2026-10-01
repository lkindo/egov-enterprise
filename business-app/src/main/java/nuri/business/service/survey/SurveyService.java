package nuri.business.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.survey.*;
import nuri.business.service.survey.dto.SurveyInfoDto;
import nuri.business.service.survey.dto.SurveyTemplateDto;
import nuri.business.service.survey.dto.SurveyArticleDto;
import nuri.business.service.survey.dto.SurveyQuestionDto;
import nuri.business.service.survey.dto.SurveyInfoMapper;
import nuri.business.service.survey.dto.SurveyTemplateMapper;
import nuri.business.service.survey.dto.SurveyArticleMapper;
import nuri.business.service.survey.dto.SurveyQuestionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyService {

    private final SurveyTemplateRepository tmplatRepository;
    private final SurveyInfoRepository infoRepository;
    private final SurveyQuestionRepository qesitmRepository;
    private final SurveyArticleRepository iemRepository;
    private final SurveyResultRepository rsltRepository;
    private final SurveyRespondentRepository rspdntRepository;
    private final SurveyTemplateMapper surveyTemplateMapper;
    private final SurveyInfoMapper surveyInfoMapper;
    private final SurveyQuestionMapper surveyQuestionMapper;
    private final SurveyArticleMapper surveyArticleMapper;

    // 설문 템플릿
    public Page<SurveyTemplateDto> getTmplatList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return tmplatRepository.findAll(Objects.requireNonNull(pageable)).map(surveyTemplateMapper::toDto);
        }
        return tmplatRepository.findBySrvyTmpltTypeCdContaining(keyword, Objects.requireNonNull(pageable))
                .map(surveyTemplateMapper::toDto);
    }

    public SurveyTemplateDto getTmplat(Long srvyTmpltSn) {
        return tmplatRepository.findById(Objects.requireNonNull(srvyTmpltSn))
                .map(surveyTemplateMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void insertTmplat(SurveyTemplateDto dto) {
        tmplatRepository.save(Objects.requireNonNull(SurveyTemplate.builder()
                .srvyTmpltTypeCd(dto.getSrvyTmpltTypeCd())
                .srvyTmpltPathNm(dto.getSrvyTmpltPathNm())
                .srvyTmpltExpln(dto.getSrvyTmpltExpln())
                .build()));
    }

    @Transactional
    public void updateTmplat(SurveyTemplateDto dto) {
        SurveyTemplate entity = tmplatRepository.findById(Objects.requireNonNull(dto.getSrvyTmpltSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrvyTmpltTypeCd(), dto.getSrvyTmpltPathNm(), dto.getSrvyTmpltExpln());
    }

    /**
     * 템플릿 삭제. 이 템플릿으로 만든 설문이 있으면 건수를 밝혀 거부한다.
     *
     * <p>[2026-10-01] 종전에는 곧바로 {@code deleteById} 를 불렀다. 쓰이는 템플릿이면 외래 키가 막았지만 화면에는
     * 사유 없는 409 기본 문구만 보였고, 없는 번호는 조용히 성공했다. 설문이 템플릿을 가리키므로 설문 건수를 말한다
     * (문항·선택지·응답은 그 설문에 딸려 있다).
     */
    @Transactional
    public void deleteTmplat(Long srvyTmpltSn) {
        Long id = Objects.requireNonNull(srvyTmpltSn);
        if (!tmplatRepository.existsById(id)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        long surveys = infoRepository.countBySrvyTmpltSn(id);
        if (surveys > 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "이 템플릿으로 만든 설문이 " + surveys + "건 있어 삭제할 수 없습니다. 그 설문을 먼저 삭제하거나 다른 템플릿으로 바꿔 주세요.");
        }
        tmplatRepository.deleteById(id);
    }

    // 설문 정보
    public Page<SurveyInfoDto> getSurveyList(String keyword, Pageable pageable) {
        // [2026-10-01 결정 21] 작성 중인 설문은 설문을 고치는 사람(SURVEY_UPDATE_ALL)에게만 보인다.
        boolean editor = canEditSurveys();
        boolean noKeyword = keyword == null || keyword.isEmpty();
        Pageable page0 = Objects.requireNonNull(pageable);
        Page<SurveyInfoDto> page = (editor
                ? (noKeyword ? infoRepository.findAll(page0) : infoRepository.findBySrvyTtlContaining(keyword, page0))
                : (noKeyword ? infoRepository.findByRlsYn("Y", page0) : infoRepository.findByRlsYnAndSrvyTtlContaining("Y", keyword, page0)))
                .map(surveyInfoMapper::toDto);
        markResponded(page.getContent());
        return page;
    }

    /**
     * [2026-10-01] 목록에서도 이미 응답한 설문을 알린다 — 종전에는 상세를 열어야 알 수 있었다(DIP V8 은 상세만).
     * 판정 축은 제출 중복 검사와 같은 로그인 ID 이고, 한 페이지를 한 번의 조회로 채운다. 모르면 null 이다.
     */
    private void markResponded(java.util.List<SurveyInfoDto> surveys) {
        java.util.Optional<String> loginId = nuri.business.security.util.SecurityUtil.getCurrentLoginId();
        if (loginId.isEmpty() || surveys.isEmpty()) {
            return;
        }
        java.util.List<Long> srvySns = surveys.stream().map(SurveyInfoDto::getSrvySn).filter(Objects::nonNull).toList();
        java.util.Set<Long> responded = srvySns.isEmpty() ? java.util.Set.of()
                : new java.util.HashSet<>(rsltRepository.findRespondedSurveySns(loginId.get(), srvySns));
        surveys.forEach(dto -> dto.setResponded(responded.contains(dto.getSrvySn())));
    }

    /** [2026-10-01 결정 21] 작성 중인 설문을 볼 수 있는 사람 — 설문을 고치는 권한자. */
    private static boolean canEditSurveys() {
        return nuri.business.security.util.SecurityUtil.hasPermission("SURVEY_UPDATE_ALL");
    }

    public SurveyInfoDto getSurvey(Long srvySn) {
        SurveyInfo survey = infoRepository.findById(Objects.requireNonNull(srvySn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [2026-10-01 결정 21] 작성 중인 설문은 응답자에게 없는 설문과 같다(404).
        if (!survey.isReleased() && !canEditSurveys()) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        SurveyInfoDto dto = surveyInfoMapper.toDto(survey);
        // [2026-09-26 DIP V8] 화면을 열 때 이미 응답했는지 알린다 — 종전에는 다 고르고 제출해야 비로소
        //   '이미 응답한 설문입니다' 로 거부됐다. 판정 축은 제출 중복 검사와 같은 로그인 ID 다.
        dto.setResponded(nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .map(loginId -> rsltRepository.existsBySrvySnAndFrstRgtrId(srvySn, loginId))
                .orElse(null));
        return dto;
    }

    @Transactional
    public void insertSurvey(SurveyInfoDto dto) {
        validateSurveyDates(dto.getSrvyBgngYmd(), dto.getSrvyEndYmd());
        if (!tmplatRepository.existsById(Objects.requireNonNull(dto.getSrvyTmpltSn()))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        infoRepository.save(Objects.requireNonNull(SurveyInfo.builder()
                .srvyTtl(dto.getSrvyTtl())
                .srvyPrps(dto.getSrvyPrps())
                .srvyWrtGdCn(dto.getSrvyWrtGdCn())
                .srvyBgngYmd(dto.getSrvyBgngYmd())
                .srvyEndYmd(dto.getSrvyEndYmd())
                .srvyTrgt(dto.getSrvyTrgt())
                .srvyTmpltSn(dto.getSrvyTmpltSn())
                .build()));
    }

    @Transactional
    public void updateSurvey(SurveyInfoDto dto) {
        validateSurveyDates(dto.getSrvyBgngYmd(), dto.getSrvyEndYmd());
        if (!tmplatRepository.existsById(Objects.requireNonNull(dto.getSrvyTmpltSn()))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        SurveyInfo entity = infoRepository.findById(Objects.requireNonNull(dto.getSrvySn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        if (!Objects.equals(entity.getSrvyTmpltSn(), dto.getSrvyTmpltSn())
                && (qesitmRepository.existsBySrvySn(entity.getSrvySn())
                        || rspdntRepository.existsBySrvySn(entity.getSrvySn()))) {
            throw new BusinessException("문항 또는 응답자가 있는 설문의 템플릿은 변경할 수 없습니다.",
                    CommonErrorCode.INVALID_INPUT_VALUE);
        }
        entity.update(dto.getSrvyTtl(), dto.getSrvyPrps(), dto.getSrvyWrtGdCn(),
                dto.getSrvyBgngYmd(), dto.getSrvyEndYmd(), dto.getSrvyTrgt(), dto.getSrvyTmpltSn());
        // [2026-10-01 결정 21] 공개 여부는 값이 올 때만 바꾼다 — 제목만 고치는 저장이 공개 상태를 되돌리지 않는다.
        if (dto.getRlsYn() != null) {
            entity.changeRelease("Y".equals(dto.getRlsYn()));
        }
    }

    /**
     * 설문을 문항·선택 항목까지 복제한다(2026-09-26 DIP B5 F6). 응답·응답자·결과는 복제하지 않는다 — 사본은 새 조사다.
     *
     * <p>제목과 기간은 요청에서 받는다({@link SurveyCopyRequest} — 원본 기간을 복사하면 같은 설문이 둘 열리고, 비우면
     * 무기한 열린다). 목적·작성 안내·대상·템플릿은 원본을 따른다. 문항 번호·선택 항목 번호·복수 선택 수는 그대로 둔다.
     *
     * @return 사본의 설문 일련번호
     */
    @Transactional
    public Long copySurvey(Long srvySn, nuri.business.service.survey.dto.SurveyCopyRequest request) {
        SurveyInfo source = infoRepository.findById(Objects.requireNonNull(srvySn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        validateSurveyDates(request.getSrvyBgngYmd(), request.getSrvyEndYmd());
        SurveyInfo copy = infoRepository.save(Objects.requireNonNull(SurveyInfo.builder()
                .srvyTtl(request.getSrvyTtl().trim())
                .srvyPrps(source.getSrvyPrps())
                .srvyWrtGdCn(source.getSrvyWrtGdCn())
                .srvyBgngYmd(request.getSrvyBgngYmd())
                .srvyEndYmd(request.getSrvyEndYmd())
                .srvyTrgt(source.getSrvyTrgt())
                .srvyTmpltSn(source.getSrvyTmpltSn())
                .build()));
        Long copySn = copy.getSrvySn();

        java.util.Map<Long, Long> copiedQuestionIds = new java.util.LinkedHashMap<>();
        for (SurveyQuestion question : qesitmRepository.findBySrvySnOrderByQstnSnAsc(srvySn)) {
            SurveyQuestion copied = qesitmRepository.save(Objects.requireNonNull(SurveyQuestion.builder()
                    .srvySn(copySn)
                    .qstnSn(question.getQstnSn())
                    .qstnTypeCd(question.getQstnTypeCd())
                    .qstnCn(question.getQstnCn())
                    .maxChcCnt(question.getMaxChcCnt())
                    .srvyTmpltSn(question.getSrvyTmpltSn())
                    .build()));
            copiedQuestionIds.put(question.getSrvyQstnSn(), copied.getSrvyQstnSn());
        }
        if (copiedQuestionIds.isEmpty()) {
            return copySn;
        }
        for (SurveyArticle article : iemRepository
                .findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(copiedQuestionIds.keySet())) {
            iemRepository.save(Objects.requireNonNull(SurveyArticle.builder()
                    .srvyQstnSn(copiedQuestionIds.get(article.getSrvyQstnSn()))
                    .srvySn(copySn)
                    .artclSn(article.getArtclSn())
                    .artclCn(article.getArtclCn())
                    .etcAnsYn(article.getEtcAnsYn())
                    .srvyTmpltSn(article.getSrvyTmpltSn())
                    .build()));
        }
        return copySn;
    }

    @Transactional
    public void deleteSurvey(Long srvySn) {
        Objects.requireNonNull(srvySn);
        // [V2_13 결속] 설문 참조 FK(NO ACTION) 하에서 자식→부모 순 연쇄 정리.
        // 기존 V2_6 FK(qstn→info)로 문항 보유 설문 삭제가 409로 파손되던 기왕 부채도 함께 해소.
        rsltRepository.deleteBySrvySn(srvySn);
        iemRepository.deleteBySrvySn(srvySn);
        qesitmRepository.deleteBySrvySn(srvySn);
        rspdntRepository.deleteBySrvySn(srvySn);
        infoRepository.deleteById(srvySn);
    }

    // 설문 문항
    public List<SurveyQuestionDto> getQuestionList(Long srvySn) {
        List<SurveyQuestion> questions = qesitmRepository.findBySrvySnOrderByQstnSnAsc(Objects.requireNonNull(srvySn));
        List<Long> qstnSns = questions.stream().map(SurveyQuestion::getSrvyQstnSn).collect(Collectors.toList());
        // 문항마다 getItemList 하던 N+1 을, 전 문항 항목을 단일 IN 조회 후 문항ID 로 그룹핑하는 방식으로 제거.
        java.util.Map<Long, List<SurveyArticleDto>> itemsByQstn = qstnSns.isEmpty()
                ? java.util.Collections.emptyMap()
                : iemRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(qstnSns).stream()
                        .collect(Collectors.groupingBy(SurveyArticle::getSrvyQstnSn,
                                Collectors.mapping(surveyArticleMapper::toDto, Collectors.toList())));
        return questions.stream()
                .map(q -> {
                    SurveyQuestionDto dto = surveyQuestionMapper.toDto(q);
                    dto.setItems(itemsByQstn.getOrDefault(q.getSrvyQstnSn(), java.util.Collections.emptyList()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public SurveyQuestionDto getQuestion(Long srvyQstnSn) {
        return qesitmRepository.findById(Objects.requireNonNull(srvyQstnSn))
                .map(surveyQuestionMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void insertQuestion(SurveyQuestionDto dto) {
        SurveyInfo survey = infoRepository.findById(Objects.requireNonNull(dto.getSrvySn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertNoResponses(survey.getSrvySn());
        // [2026-09-26 DIP B4 P6] 순번은 서버가 매긴다 — 화면이 '문항 수 + 1' 을 보내, 중간 문항을 지운 뒤 추가하면 마지막
        //   문항과 순번이 겹쳤다. 이 설문의 가장 큰 순번 다음을 쓴다.
        long nextQstnSn = qesitmRepository.findBySrvySnOrderByQstnSnAsc(survey.getSrvySn()).stream()
                .map(SurveyQuestion::getQstnSn)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L) + 1;
        qesitmRepository.save(Objects.requireNonNull(SurveyQuestion.builder()
                .srvySn(survey.getSrvySn())
                .qstnSn(nextQstnSn)
                .qstnTypeCd(dto.getQstnTypeCd())
                .qstnCn(dto.getQstnCn())
                .maxChcCnt(dto.getMaxChcCnt())
                .srvyTmpltSn(survey.getSrvyTmpltSn())
                .build()));
    }

    @Transactional
    public void updateQuestion(SurveyQuestionDto dto) {
        SurveyQuestion entity = qesitmRepository.findById(Objects.requireNonNull(dto.getSrvyQstnSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [2026-09-26 DIP B4 P6] 응답이 모인 뒤 문구·유형·선택 수를 바꾸면 이미 받은 응답이 다른 질문에 대한 답이 된다.
        //   순번(배치)만 바꾸는 것은 허용한다.
        boolean meaningChanged = !Objects.equals(entity.getQstnCn(), dto.getQstnCn())
                || !Objects.equals(entity.getQstnTypeCd(), dto.getQstnTypeCd())
                || effectiveMaxChoice(entity.getMaxChcCnt()) != effectiveMaxChoice(dto.getMaxChcCnt());
        if (meaningChanged) {
            assertNotAnswered(rsltRepository.countBySrvyQstnSn(entity.getSrvyQstnSn()), "문항");
        }
        entity.update(dto.getQstnSn(), dto.getQstnTypeCd(), dto.getQstnCn(), dto.getMaxChcCnt());
    }

    /** 응답 판정과 같은 규칙 — NULL·0·음수는 하나만 고른다(SurveyResultService#submitResponse). */
    private static int effectiveMaxChoice(Integer maxChcCnt) {
        return maxChcCnt == null || maxChcCnt <= 0 ? 1 : maxChcCnt;
    }

    private static void assertNotAnswered(long responseCount, String target) {
        if (responseCount > 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "응답 " + responseCount + "건이 있는 " + target + "의 문구와 선택 방식은 바꿀 수 없습니다. 새 문항으로 추가해 주세요.");
        }
    }

    @Transactional
    public void deleteQuestion(Long srvySn, Long srvyQstnSn) {
        Objects.requireNonNull(srvySn);
        Objects.requireNonNull(srvyQstnSn);
        SurveyQuestion question = qesitmRepository.findById(srvyQstnSn)
                .filter(candidate -> srvySn.equals(candidate.getSrvySn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertNoResponses(rsltRepository.countBySrvyQstnSn(question.getSrvyQstnSn()), "문항");
        // [V2_13 결속] 문항 삭제 시 응답·항목 선정리 (기존 fk_tb_srvy_artcl_tb_srvy_qstn 기왕 부채 해소)
        rsltRepository.deleteBySrvyQstnSn(question.getSrvyQstnSn());
        iemRepository.deleteBySrvyQstnSn(question.getSrvyQstnSn());
        qesitmRepository.deleteById(question.getSrvyQstnSn());
    }

    // 설문 항목
    public List<SurveyArticleDto> getItemList(Long srvyQstnSn) {
        return iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(Objects.requireNonNull(srvyQstnSn)).stream()
                .map(surveyArticleMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void insertItem(SurveyArticleDto dto) {
        SurveyQuestion question = qesitmRepository.findById(Objects.requireNonNull(dto.getSrvyQstnSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertNoResponses(question.getSrvySn());
        iemRepository.save(Objects.requireNonNull(SurveyArticle.builder()
                .srvyQstnSn(question.getSrvyQstnSn())
                .srvySn(question.getSrvySn())
                .artclSn(dto.getArtclSn())
                .artclCn(dto.getArtclCn())
                .etcAnsYn(dto.getEtcAnsYn())
                .srvyTmpltSn(question.getSrvyTmpltSn())
                .build()));
    }

    @Transactional
    public void updateItem(SurveyArticleDto dto) {
        SurveyArticle entity = iemRepository.findById(Objects.requireNonNull(dto.getSrvyArtclSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [2026-09-26 DIP B4 P6] 응답이 모인 문항의 선택지 문구를 바꾸면 이미 고른 사람의 답이 다른 뜻이 된다.
        if (!Objects.equals(entity.getArtclCn(), dto.getArtclCn())) {
            assertNotAnswered(rsltRepository.countBySrvyQstnSn(entity.getSrvyQstnSn()), "문항");
        }
        entity.update(dto.getArtclSn(), dto.getArtclCn(), dto.getEtcAnsYn());
    }

    @Transactional
    public void deleteItem(Long srvyArtclSn) {
        Objects.requireNonNull(srvyArtclSn);
        assertNoResponses(rsltRepository.countBySrvyArtclSn(srvyArtclSn), "선택 항목");
        // [V2_13 결속] 항목 삭제 시 해당 항목 응답 선정리 (기존 fk_tb_srvy_rslt_tb_srvy_artcl 기왕 부채 해소)
        rsltRepository.deleteBySrvyArtclSn(srvyArtclSn);
        iemRepository.deleteById(srvyArtclSn);
    }

    /**
     * 응답이 있는 문항·항목은 지우지 않는다. [2026-09-14 DEC-OPS-095]
     *
     * <p>V2_13 은 FK 오류를 피하려고 삭제 전에 응답을 함께 지우게 했는데, 그 결과 설문을 편집하다 문항 하나를 지우면
     * 이미 모은 응답이 경고 없이 사라졌다. 편집 중의 삭제는 응답 보존과 양립해야 한다 — 템플릿 변경이 문항·응답자가
     * 있으면 막히는 것(updateSurvey)과 같은 기준이다. 응답 채로 정리하려면 설문 전체를 삭제한다(명시적 행위).
     * 응답이 없는 문항·항목의 선정리 경로는 그대로 두어 FK 순서를 유지한다.
     */
    private static void assertNoResponses(long responseCount, String target) {
        if (responseCount > 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "응답 " + responseCount + "건이 있는 " + target + "은(는) 삭제할 수 없습니다. 응답을 보존하려면 그대로 두고, 설문을 통째로 정리하려면 설문을 삭제하세요.");
        }
    }

    private void validateSurveyDates(String beginDe, String endDe) {
        if (beginDe != null && !beginDe.isEmpty() && endDe != null && !endDe.isEmpty()) {
            // Remove dashes for comparison if present
            String start = beginDe.replace("-", "");
            String end = endDe.replace("-", "");
            if (start.compareTo(end) > 0) {
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }

    /**
     * [2026-10-01 결정 21] 응답이 모인 설문에는 문항·선택 항목을 더하지 않는다. 이미 낸 응답자에게는 새 문항의 답이 없어
     * 통계의 문항별 응답 수가 어긋나고, 모든 문항에 답해야 제출되는 규칙(DEC-OPS-157)과도 맞지 않는다.
     */
    private void assertNoResponses(Long srvySn) {
        if (srvySn != null && rsltRepository.existsBySrvySn(srvySn)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "응답이 있는 설문에는 문항이나 선택 항목을 더할 수 없습니다. 설문을 복제해 새 차수로 만드세요.");
        }
    }
}
