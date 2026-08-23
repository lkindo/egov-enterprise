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
        return infoRepository.findById(Objects.requireNonNull(srvySn))
                .map(surveyInfoMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
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
        qesitmRepository.save(Objects.requireNonNull(SurveyQuestion.builder()
                .srvySn(survey.getSrvySn())
                .qstnSn(dto.getQstnSn())
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
        entity.update(dto.getQstnSn(), dto.getQstnTypeCd(), dto.getQstnCn(), dto.getMaxChcCnt());
    }

    @Transactional
    public void deleteQuestion(Long srvyQstnSn) {
        Objects.requireNonNull(srvyQstnSn);
        // [V2_13 결속] 문항 삭제 시 응답·항목 선정리 (기존 fk_tb_srvy_artcl_tb_srvy_qstn 기왕 부채 해소)
        rsltRepository.deleteBySrvyQstnSn(srvyQstnSn);
        iemRepository.deleteBySrvyQstnSn(srvyQstnSn);
        qesitmRepository.deleteById(srvyQstnSn);
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
        entity.update(dto.getArtclSn(), dto.getArtclCn(), dto.getEtcAnsYn());
    }

    @Transactional
    public void deleteItem(Long srvyArtclSn) {
        Objects.requireNonNull(srvyArtclSn);
        // [V2_13 결속] 항목 삭제 시 해당 항목 응답 선정리 (기존 fk_tb_srvy_rslt_tb_srvy_artcl 기왕 부채 해소)
        rsltRepository.deleteBySrvyArtclSn(srvyArtclSn);
        iemRepository.deleteById(srvyArtclSn);
    }

    private void validateSurveyDates(String beginDe, String endDe) {
        if (beginDe != null && endDe != null) {
            // Remove dashes for comparison if present
            String start = beginDe.replace("-", "");
            String end = endDe.replace("-", "");
            if (start.compareTo(end) > 0) {
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }
}
