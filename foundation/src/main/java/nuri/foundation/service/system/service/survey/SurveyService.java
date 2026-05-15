package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.system.service.survey.*;
import nuri.foundation.service.system.service.survey.dto.QustnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QustnrTmplatDto;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
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

    private final QustnrTmplatRepository tmplatRepository;
    private final QustnrInfoRepository infoRepository;
    private final QustnrQesitmRepository qesitmRepository;
    private final QustnrIemRepository iemRepository;

    // 설문 템플릿
    @Override
    public Page<QustnrTmplatDto> getTmplatList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return tmplatRepository.findAll(Objects.requireNonNull(pageable)).map(QustnrTmplatDto::from);
        }
        return tmplatRepository.findBySrvyTmplatTypeCdContaining(keyword, Objects.requireNonNull(pageable))
                .map(QustnrTmplatDto::from);
    }

    @Override
    public QustnrTmplatDto getTmplat(String tmplatId) {
        return tmplatRepository.findById(Objects.requireNonNull(tmplatId))
                .map(QustnrTmplatDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertTmplat(QustnrTmplatDto dto) {
        String id = "QUSTMP_" + System.currentTimeMillis();
        tmplatRepository.save(Objects.requireNonNull(QustnrTmplat.builder()
                .srvyTmplatId(id)
                .srvyTmplatTypeCd(dto.getSrvyTmplatTypeCd())
                .srvyTmplatImgPath(dto.getSrvyTmplatImgPath())
                .srvyTmplatCn(dto.getSrvyTmplatCn())
                .build()));
    }

    @Override
    @Transactional
    public void updateTmplat(QustnrTmplatDto dto) {
        QustnrTmplat entity = tmplatRepository.findById(Objects.requireNonNull(dto.getSrvyTmplatId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrvyTmplatTypeCd(), dto.getSrvyTmplatImgPath(), dto.getSrvyTmplatCn());
    }

    @Override
    @Transactional
    public void deleteTmplat(String tmplatId) {
        tmplatRepository.deleteById(Objects.requireNonNull(tmplatId));
    }

    // 설문 정보
    @Override
    public Page<QustnrInfoDto> getSurveyList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return infoRepository.findAll(Objects.requireNonNull(pageable)).map(QustnrInfoDto::from);
        }
        return infoRepository.findBySrvyTtlContaining(keyword, Objects.requireNonNull(pageable))
                .map(QustnrInfoDto::from);
    }

    @Override
    public QustnrInfoDto getSurvey(String qustnrId) {
        return infoRepository.findById(Objects.requireNonNull(qustnrId))
                .map(QustnrInfoDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertSurvey(QustnrInfoDto dto) {
        validateSurveyDates(dto.getSrvyBgngYmd(), dto.getSrvyEndYmd());
        String id = "QESTNR_" + System.currentTimeMillis();
        infoRepository.save(Objects.requireNonNull(QustnrInfo.builder()
                .srvyId(id)
                .srvyTtl(dto.getSrvyTtl())
                .srvyPrpsCn(dto.getSrvyPrpsCn())
                .srvyGuidCn(dto.getSrvyGuidCn())
                .srvyBgngYmd(dto.getSrvyBgngYmd())
                .srvyEndYmd(dto.getSrvyEndYmd())
                .srvyTrgtCn(dto.getSrvyTrgtCn())
                .srvyTmplatId(dto.getSrvyTmplatId())
                .build()));
    }

    @Override
    @Transactional
    public void updateSurvey(QustnrInfoDto dto) {
        validateSurveyDates(dto.getSrvyBgngYmd(), dto.getSrvyEndYmd());
        QustnrInfo entity = infoRepository.findById(Objects.requireNonNull(dto.getSrvyId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrvyTtl(), dto.getSrvyPrpsCn(), dto.getSrvyGuidCn(),
                dto.getSrvyBgngYmd(), dto.getSrvyEndYmd(), dto.getSrvyTrgtCn(), dto.getSrvyTmplatId());
    }

    @Override
    @Transactional
    public void deleteSurvey(String qustnrId) {
        infoRepository.deleteById(Objects.requireNonNull(qustnrId));
    }

    // 설문 문항
    @Override
    public List<QustnrQesitmDto> getQuestionList(String qustnrId) {
        return qesitmRepository.findBySrvyIdOrderBySrvyQitemSnAsc(Objects.requireNonNull(qustnrId)).stream()
                .map(q -> {
                    QustnrQesitmDto dto = QustnrQesitmDto.from(q);
                    dto.setItems(getItemList(q.getSrvyQitemId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public QustnrQesitmDto getQuestion(String qesitmId) {
        return qesitmRepository.findById(Objects.requireNonNull(qesitmId))
                .map(QustnrQesitmDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertQuestion(QustnrQesitmDto dto) {
        String id = "QESITM_" + System.currentTimeMillis();
        qesitmRepository.save(Objects.requireNonNull(QustnrQesitm.builder()
                .srvyQitemId(id)
                .srvyId(dto.getSrvyId())
                .srvyQitemSn(dto.getSrvyQitemSn())
                .srvyQitemTypeCd(dto.getSrvyQitemTypeCd())
                .srvyQitemCn(dto.getSrvyQitemCn())
                .maxChcCnt(dto.getMaxChcCnt())
                .srvyTmplatId(dto.getSrvyTmplatId())
                .build()));
    }

    @Override
    @Transactional
    public void updateQuestion(QustnrQesitmDto dto) {
        QustnrQesitm entity = qesitmRepository.findById(Objects.requireNonNull(dto.getSrvyQitemId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrvyQitemSn(), dto.getSrvyQitemTypeCd(), dto.getSrvyQitemCn(), dto.getMaxChcCnt());
    }

    @Override
    @Transactional
    public void deleteQuestion(String qesitmId) {
        qesitmRepository.deleteById(Objects.requireNonNull(qesitmId));
    }

    // 설문 항목
    @Override
    public List<QustnrIemDto> getItemList(String qesitmId) {
        return iemRepository.findBySrvyQitemIdOrderBySrvyItemSnAsc(Objects.requireNonNull(qesitmId)).stream()
                .map(QustnrIemDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertItem(QustnrIemDto dto) {
        String id = "IEM_" + System.currentTimeMillis();
        iemRepository.save(Objects.requireNonNull(QustnrIem.builder()
                .srvyItemId(id)
                .srvyQitemId(dto.getSrvyQitemId())
                .srvyId(dto.getSrvyId())
                .srvyItemSn(dto.getSrvyItemSn())
                .srvyItemCn(dto.getSrvyItemCn())
                .etcAnsYn(dto.getEtcAnsYn())
                .srvyTmplatId(dto.getSrvyTmplatId())
                .build()));
    }

    @Override
    @Transactional
    public void updateItem(QustnrIemDto dto) {
        QustnrIem entity = iemRepository.findById(Objects.requireNonNull(dto.getSrvyItemId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrvyItemSn(), dto.getSrvyItemCn(), dto.getEtcAnsYn());
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
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", ErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }
}
