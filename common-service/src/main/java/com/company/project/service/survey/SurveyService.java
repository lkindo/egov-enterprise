package com.company.project.service.survey;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.survey.*;
import com.company.project.service.survey.dto.QestnrInfoDto;
import com.company.project.service.survey.dto.QestnrTmplatDto;
import com.company.project.service.survey.dto.QustnrIemDto;
import com.company.project.service.survey.dto.QustnrQesitmDto;
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

    private final QestnrTmplatRepository tmplatRepository;
    private final QestnrInfoRepository infoRepository;
    private final QustnrQesitmRepository qesitmRepository;
    private final QustnrIemRepository iemRepository;

    // ??—ëµ†??
    @Override
    public Page<QestnrTmplatDto> getTmplatList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return tmplatRepository.findAll(Objects.requireNonNull(pageable)).map(QestnrTmplatDto::from);
        }
        return tmplatRepository.findByQestnrTmplatTyContaining(keyword, Objects.requireNonNull(pageable))
                .map(QestnrTmplatDto::from);
    }

    @Override
    public QestnrTmplatDto getTmplat(String tmplatId) {
        return tmplatRepository.findById(Objects.requireNonNull(tmplatId))
                .map(QestnrTmplatDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertTmplat(QestnrTmplatDto dto) {
        String id = "QUSTMP_" + String.format("%013d", System.currentTimeMillis());
        tmplatRepository.save(Objects.requireNonNull(QestnrTmplat.builder()
                .qestnrTmplatId(id)
                .qestnrTmplatTy(dto.getQestnrTmplatTy())
                .qestnrTmplatImagepathnm(dto.getQestnrTmplatImagepathnm())
                .qestnrTmplatCn(dto.getQestnrTmplatCn())
                .build()));
    }

    @Override
    @Transactional
    public void updateTmplat(QestnrTmplatDto dto) {
        QestnrTmplat entity = tmplatRepository.findById(Objects.requireNonNull(dto.getQestnrTmplatId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQestnrTmplatTy(), dto.getQestnrTmplatImagepathnm(), dto.getQestnrTmplatCn());
    }

    @Override
    @Transactional
    public void deleteTmplat(String tmplatId) {
        tmplatRepository.deleteById(Objects.requireNonNull(tmplatId));
    }

    // ??»Ð??ëº£ë‚«
    @Override
    public Page<QestnrInfoDto> getSurveyList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return infoRepository.findAll(Objects.requireNonNull(pageable)).map(QestnrInfoDto::from);
        }
        return infoRepository.findByQestnrSjContaining(keyword, Objects.requireNonNull(pageable))
                .map(QestnrInfoDto::from);
    }

    @Override
    public QestnrInfoDto getSurvey(String qestnrId) {
        return infoRepository.findById(Objects.requireNonNull(qestnrId))
                .map(QestnrInfoDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertSurvey(QestnrInfoDto dto) {
        String id = "QESTNR_" + String.format("%013d", System.currentTimeMillis());
        infoRepository.save(Objects.requireNonNull(QestnrInfo.builder()
                .qestnrId(id)
                .qestnrSj(dto.getQestnrSj())
                .qestnrPurps(dto.getQestnrPurps())
                .qestnrWritngGuidanceCn(dto.getQestnrWritngGuidanceCn())
                .qestnrBeginDe(dto.getQestnrBeginDe())
                .qestnrEndDe(dto.getQestnrEndDe())
                .qestnrTrget(dto.getQestnrTrget())
                .qestnrTmplatId(dto.getQestnrTmplatId())
                .build()));
    }

    @Override
    @Transactional
    public void updateSurvey(QestnrInfoDto dto) {
        QestnrInfo entity = infoRepository.findById(Objects.requireNonNull(dto.getQestnrId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQestnrSj(), dto.getQestnrPurps(), dto.getQestnrWritngGuidanceCn(),
                dto.getQestnrBeginDe(), dto.getQestnrEndDe(), dto.getQestnrTrget(), dto.getQestnrTmplatId());
    }

    @Override
    @Transactional
    public void deleteSurvey(String qestnrId) {
        infoRepository.deleteById(Objects.requireNonNull(qestnrId));
    }

    // ??»Ð??¾ëª…ë¹?    @Override
    public List<QustnrQesitmDto> getQuestionList(String qestnrId) {
        return qesitmRepository.findByQestnrIdOrderByQestnSnAsc(Objects.requireNonNull(qestnrId)).stream()
                .map(q -> {
                    QustnrQesitmDto dto = QustnrQesitmDto.from(q);
                    dto.setItems(getItemList(q.getQestnrQesitmId()));
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
        String id = "QESITM_" + String.format("%013d", System.currentTimeMillis());
        qesitmRepository.save(Objects.requireNonNull(QustnrQesitm.builder()
                .qestnrQesitmId(id)
                .qestnrId(dto.getQestnrId())
                .qestnSn(dto.getQestnSn())
                .qestnTyCode(dto.getQestnTyCode())
                .qestnCn(dto.getQestnCn())
                .mxmmChoiseCo(dto.getMxmmChoiseCo())
                .qestnrTmplatId(dto.getQestnrTmplatId())
                .build()));
    }

    @Override
    @Transactional
    public void updateQuestion(QustnrQesitmDto dto) {
        QustnrQesitm entity = qesitmRepository.findById(Objects.requireNonNull(dto.getQestnrQesitmId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQestnSn(), dto.getQestnTyCode(), dto.getQestnCn(), dto.getMxmmChoiseCo());
    }

    @Override
    @Transactional
    public void deleteQuestion(String qesitmId) {
        qesitmRepository.deleteById(Objects.requireNonNull(qesitmId));
    }

    // ??»Ð?????    @Override
    public List<QustnrIemDto> getItemList(String qesitmId) {
        return iemRepository.findByQestnrQesitmIdOrderByIemSnAsc(Objects.requireNonNull(qesitmId)).stream()
                .map(QustnrIemDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertItem(QustnrIemDto dto) {
        String id = "IEM_" + String.format("%013d", System.currentTimeMillis());
        iemRepository.save(Objects.requireNonNull(QustnrIem.builder()
                .qustnrIemId(id)
                .qestnrQesitmId(dto.getQestnrQesitmId())
                .qestnrId(dto.getQestnrId())
                .iemSn(dto.getIemSn())
                .iemCn(dto.getIemCn())
                .etcAnswerAt(dto.getEtcAnswerAt())
                .qestnrTmplatId(dto.getQestnrTmplatId())
                .build()));
    }

    @Override
    @Transactional
    public void updateItem(QustnrIemDto dto) {
        QustnrIem entity = iemRepository.findById(Objects.requireNonNull(dto.getQustnrIemId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getIemSn(), dto.getIemCn(), dto.getEtcAnswerAt());
    }

    @Override
    @Transactional
    public void deleteItem(String iemId) {
        iemRepository.deleteById(Objects.requireNonNull(iemId));
    }
}
