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

    @Transactional
    public void deleteTmplat(Long srvyTmpltSn) {
        tmplatRepository.deleteById(Objects.requireNonNull(srvyTmpltSn));
    }

    // 설문 정보
    public Page<SurveyInfoDto> getSurveyList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return infoRepository.findAll(Objects.requireNonNull(pageable)).map(surveyInfoMapper::toDto);
        }
        return infoRepository.findBySrvyTtlContaining(keyword, Objects.requireNonNull(pageable))
                .map(surveyInfoMapper::toDto);
    }

    public SurveyInfoDto getSurvey(Long srvySn) {
        SurveyInfoDto dto = infoRepository.findById(Objects.requireNonNull(srvySn))
                .map(surveyInfoMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
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
}
