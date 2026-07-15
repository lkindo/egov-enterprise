package nuri.business.service.system.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.service.survey.*;
import nuri.business.service.system.service.survey.dto.SurveyInfoDto;
import nuri.business.service.system.service.survey.dto.SurveyTemplateDto;
import nuri.business.service.system.service.survey.dto.SurveyArticleDto;
import nuri.business.service.system.service.survey.dto.SurveyQuestionDto;
import nuri.business.service.system.service.survey.dto.SurveyInfoMapper;
import nuri.business.service.system.service.survey.dto.SurveyTemplateMapper;
import nuri.business.service.system.service.survey.dto.SurveyArticleMapper;
import nuri.business.service.system.service.survey.dto.SurveyQuestionMapper;
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
public class SurveyService implements EgovSurveyService {

    private final SurveyTemplateRepository tmplatRepository;
    private final SurveyInfoRepository infoRepository;
    private final SurveyQuestionRepository qesitmRepository;
    private final SurveyArticleRepository iemRepository;
    private final SurveyTemplateMapper surveyTemplateMapper;
    private final SurveyInfoMapper surveyInfoMapper;
    private final SurveyQuestionMapper surveyQuestionMapper;
    private final SurveyArticleMapper surveyArticleMapper;

    // 설문 템플릿
    @Override
    public Page<SurveyTemplateDto> getTmplatList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return tmplatRepository.findAll(Objects.requireNonNull(pageable)).map(surveyTemplateMapper::toDto);
        }
        return tmplatRepository.findBySrvyTmpltTypeCdContaining(keyword, Objects.requireNonNull(pageable))
                .map(surveyTemplateMapper::toDto);
    }

    @Override
    public SurveyTemplateDto getTmplat(String tmplatId) {
        return tmplatRepository.findById(Objects.requireNonNull(tmplatId))
                .map(surveyTemplateMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertTmplat(SurveyTemplateDto dto) {
        String id = "QUSTMP_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13);
        tmplatRepository.save(Objects.requireNonNull(SurveyTemplate.builder()
                .srvyTmpltId(id)
                .srvyTmpltTypeCd(dto.getSrvyTmpltTypeCd())
                .srvyTmpltPathNm(dto.getSrvyTmpltPathNm())
                .srvyTmpltExpln(dto.getSrvyTmpltExpln())
                .build()));
    }

    @Override
    @Transactional
    public void updateTmplat(SurveyTemplateDto dto) {
        SurveyTemplate entity = tmplatRepository.findById(Objects.requireNonNull(dto.getSrvyTmpltId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrvyTmpltTypeCd(), dto.getSrvyTmpltPathNm(), dto.getSrvyTmpltExpln());
    }

    @Override
    @Transactional
    public void deleteTmplat(String tmplatId) {
        tmplatRepository.deleteById(Objects.requireNonNull(tmplatId));
    }

    // 설문 정보
    @Override
    public Page<SurveyInfoDto> getSurveyList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return infoRepository.findAll(Objects.requireNonNull(pageable)).map(surveyInfoMapper::toDto);
        }
        return infoRepository.findBySrvyTtlContaining(keyword, Objects.requireNonNull(pageable))
                .map(surveyInfoMapper::toDto);
    }

    @Override
    public SurveyInfoDto getSurvey(String qustnrId) {
        return infoRepository.findById(Objects.requireNonNull(qustnrId))
                .map(surveyInfoMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertSurvey(SurveyInfoDto dto) {
        validateSurveyDates(dto.getSrvyBgngYmd(), dto.getSrvyEndYmd());
        String id = "QESTNR_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13);
        infoRepository.save(Objects.requireNonNull(SurveyInfo.builder()
                .srvyId(id)
                .srvyTtl(dto.getSrvyTtl())
                .srvyPrps(dto.getSrvyPrps())
                .srvyWrtGdCn(dto.getSrvyWrtGdCn())
                .srvyBgngYmd(dto.getSrvyBgngYmd())
                .srvyEndYmd(dto.getSrvyEndYmd())
                .srvyTrgt(dto.getSrvyTrgt())
                .srvyTmpltId(dto.getSrvyTmpltId())
                .build()));
    }

    @Override
    @Transactional
    public void updateSurvey(SurveyInfoDto dto) {
        validateSurveyDates(dto.getSrvyBgngYmd(), dto.getSrvyEndYmd());
        SurveyInfo entity = infoRepository.findById(Objects.requireNonNull(dto.getSrvyId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrvyTtl(), dto.getSrvyPrps(), dto.getSrvyWrtGdCn(),
                dto.getSrvyBgngYmd(), dto.getSrvyEndYmd(), dto.getSrvyTrgt(), dto.getSrvyTmpltId());
    }

    @Override
    @Transactional
    public void deleteSurvey(String qustnrId) {
        infoRepository.deleteById(Objects.requireNonNull(qustnrId));
    }

    // 설문 문항
    @Override
    public List<SurveyQuestionDto> getQuestionList(String qustnrId) {
        List<SurveyQuestion> questions = qesitmRepository.findBySrvyIdOrderByQstnSnAsc(Objects.requireNonNull(qustnrId));
        List<String> qstnIds = questions.stream().map(q -> q.getSrvyQstnId()).collect(Collectors.toList());
        // 문항마다 getItemList 하던 N+1 을, 전 문항 항목을 단일 IN 조회 후 문항ID 로 그룹핑하는 방식으로 제거.
        java.util.Map<String, List<SurveyArticleDto>> itemsByQstn = qstnIds.isEmpty()
                ? java.util.Collections.emptyMap()
                : iemRepository.findBySrvyQstnIdInOrderBySrvyQstnIdAscArtclSnAsc(qstnIds).stream()
                        .collect(Collectors.groupingBy(a -> a.getSrvyQstnId(),
                                Collectors.mapping(surveyArticleMapper::toDto, Collectors.toList())));
        return questions.stream()
                .map(q -> {
                    SurveyQuestionDto dto = surveyQuestionMapper.toDto(q);
                    dto.setItems(itemsByQstn.getOrDefault(q.getSrvyQstnId(), java.util.Collections.emptyList()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public SurveyQuestionDto getQuestion(String qesitmId) {
        return qesitmRepository.findById(Objects.requireNonNull(qesitmId))
                .map(surveyQuestionMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertQuestion(SurveyQuestionDto dto) {
        String id = "QESITM_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13);
        qesitmRepository.save(Objects.requireNonNull(SurveyQuestion.builder()
                .srvyQstnId(id)
                .srvyId(dto.getSrvyId())
                .qstnSn(dto.getQstnSn())
                .qstnTypeCd(dto.getQstnTypeCd())
                .qstnCn(dto.getQstnCn())
                .maxChcCnt(dto.getMaxChcCnt())
                .srvyTmpltId(dto.getSrvyTmpltId())
                .build()));
    }

    @Override
    @Transactional
    public void updateQuestion(SurveyQuestionDto dto) {
        SurveyQuestion entity = qesitmRepository.findById(Objects.requireNonNull(dto.getSrvyQstnId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQstnSn(), dto.getQstnTypeCd(), dto.getQstnCn(), dto.getMaxChcCnt());
    }

    @Override
    @Transactional
    public void deleteQuestion(String qesitmId) {
        qesitmRepository.deleteById(Objects.requireNonNull(qesitmId));
    }

    // 설문 항목
    @Override
    public List<SurveyArticleDto> getItemList(String qesitmId) {
        return iemRepository.findBySrvyQstnIdOrderByArtclSnAsc(Objects.requireNonNull(qesitmId)).stream()
                .map(surveyArticleMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertItem(SurveyArticleDto dto) {
        String id = "IEM_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13);
        iemRepository.save(Objects.requireNonNull(SurveyArticle.builder()
                .srvyArtclId(id)
                .srvyQstnId(dto.getSrvyQstnId())
                .srvyId(dto.getSrvyId())
                .artclSn(dto.getArtclSn())
                .artclCn(dto.getArtclCn())
                .etcAnsYn(dto.getEtcAnsYn())
                .srvyTmpltId(dto.getSrvyTmpltId())
                .build()));
    }

    @Override
    @Transactional
    public void updateItem(SurveyArticleDto dto) {
        SurveyArticle entity = iemRepository.findById(Objects.requireNonNull(dto.getSrvyArtclId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getArtclSn(), dto.getArtclCn(), dto.getEtcAnsYn());
    }

    @Override
    @Transactional
    public void deleteItem(String iemId) {
        iemRepository.deleteById(Objects.requireNonNull(iemId));
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
