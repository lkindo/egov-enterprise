package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.system.service.survey.OnlinePollManage;
import nuri.foundation.domain.system.service.survey.OnlinePollItem;
import nuri.foundation.domain.system.service.survey.OnlinePollResult;
import nuri.foundation.domain.system.service.survey.OnlinePollManageRepository;
import nuri.foundation.domain.system.service.survey.OnlinePollItemRepository;
import nuri.foundation.domain.system.service.survey.OnlinePollResultRepository;
import nuri.foundation.service.system.service.survey.dto.OnlinePollItemDto;
import nuri.foundation.service.system.service.survey.dto.OnlinePollManageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OnlinePollService implements EgovOnlinePollService {

    private final OnlinePollManageRepository pollManageRepository;
    private final OnlinePollItemRepository pollItemRepository;
    private final OnlinePollResultRepository pollResultRepository;

    @Override
    public Page<OnlinePollManageDto> getPollList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        Page<OnlinePollManage> entities;
        String searchKeyword = (keyword == null) ? "" : keyword;
        if (searchKeyword.isEmpty()) {
            entities = pollManageRepository.findAll(pageable);
        } else {
            entities = pollManageRepository.findByPollNmContaining(searchKeyword, pageable);
        }

        return entities.map(entity -> {
            OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
            if (dto.getPollItems() != null) {
                dto.getPollItems().forEach(itemDto -> {
                    itemDto.setPollIemCo(pollResultRepository.countByPollIemId(itemDto.getPollIemId()));
                });
            }
            return dto;
        });
    }

    @Override
    public OnlinePollManageDto getPoll(String pollId) {
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(pollId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
        dto.setPollItems(getPollItemList(pollId));
        return dto;
    }

    @Override
    @Transactional
    public void insertPoll(OnlinePollManageDto dto) {
        if (!nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        
        validatePollDates(dto.getPollBgngYmd(), dto.getPollEndYmd());
        if (dto.getPollId() == null || dto.getPollId().isEmpty()) {
            dto.setPollId("P" + System.currentTimeMillis());
        }
        
        OnlinePollManage pollManage = OnlinePollManage.builder()
                .pollId(dto.getPollId())
                .pollNm(dto.getPollNm())
                .pollBgngYmd(dto.getPollBgngYmd())
                .pollEndYmd(dto.getPollEndYmd())
                .pollTypeCd(dto.getPollTypeCd())
                .pollDsuseYn(dto.getPollDsuseYn() != null ? dto.getPollDsuseYn() : "N")
                .pollAutoDsuseYn(dto.getPollAutoDsuseYn() != null ? dto.getPollAutoDsuseYn() : "N")
                .pollItems(new ArrayList<>())
                .build();

        if (dto.getPollItems() != null) {
            long timestamp = System.currentTimeMillis();
            int index = 0;
            for (OnlinePollItemDto itemDto : dto.getPollItems()) {
                OnlinePollItem item = OnlinePollItem.builder()
                        .pollIemId("PI" + timestamp + (index++))
                        .pollManage(pollManage)
                        .pollIemNm(itemDto.getPollIemNm())
                        .build();
                pollManage.getPollItems().add(item);
            }
        }

        pollManageRepository.save(pollManage);
    }

    @Override
    @Transactional
    public void updatePoll(OnlinePollManageDto dto) {
        if (!nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        validatePollDates(dto.getPollBgngYmd(), dto.getPollEndYmd());
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(dto.getPollId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        
        entity.update(dto.getPollNm(), dto.getPollBgngYmd(), dto.getPollEndYmd(),
                dto.getPollTypeCd(), dto.getPollDsuseYn(), dto.getPollAutoDsuseYn());
        
        if (dto.getPollItems() != null) {
            entity.getPollItems().clear();
            long timestamp = System.currentTimeMillis();
            int index = 0;
            for (OnlinePollItemDto itemDto : dto.getPollItems()) {
                OnlinePollItem item = OnlinePollItem.builder()
                        .pollIemId("PI" + timestamp + (index++))
                        .pollManage(entity)
                        .pollIemNm(itemDto.getPollIemNm())
                        .build();
                entity.getPollItems().add(item);
            }
        }
    }

    @Override
    @Transactional
    public void deletePoll(String pollId) {
        if (!nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        pollManageRepository.deleteById(Objects.requireNonNull(pollId));
    }

    @Override
    public List<OnlinePollItemDto> getPollItemList(String pollId) {
        return pollItemRepository.findByPollManagePollId(Objects.requireNonNull(pollId)).stream()
                .map(item -> {
                    OnlinePollItemDto dto = OnlinePollItemDto.from(item);
                    dto.setPollIemCo(pollResultRepository.countByPollIemId(item.getPollIemId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertPollItem(OnlinePollItemDto dto) {
        OnlinePollManage pollManage = pollManageRepository.findById(dto.getPollId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        
        String id = "PI" + System.currentTimeMillis();
        pollItemRepository.save(Objects.requireNonNull(OnlinePollItem.builder()
                .pollIemId(id)
                .pollManage(pollManage)
                .pollIemNm(dto.getPollIemNm())
                .build()));
    }

    @Override
    @Transactional
    public void updatePollItem(OnlinePollItemDto dto) {
        OnlinePollItem entity = pollItemRepository.findById(Objects.requireNonNull(dto.getPollIemId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollIemNm());
    }

    @Override
    @Transactional
    public void deletePollItem(String pollIemId) {
        pollItemRepository.deleteById(Objects.requireNonNull(pollIemId));
    }

    @Override
    @Transactional
    public void vote(String pollId, String pollIemId, String userId) {
        OnlinePollManage poll = pollManageRepository.findById(pollId)
                .orElseThrow(() -> new BusinessException("설문을 찾을 수 없습니다.", ErrorCode.RESOURCE_NOT_FOUND));

        if ("Y".equals(poll.getPollDsuseYn())) {
            throw new BusinessException("종료되었거나 폐기된 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        String today = java.time.LocalDate.now().toString();
        if (poll.getPollBgngYmd().compareTo(today) > 0) {
            throw new BusinessException("설문 시작 전입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }
        if (poll.getPollEndYmd().compareTo(today) < 0) {
            throw new BusinessException("이미 종료된 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        if (pollResultRepository.countByPollIdAndFrstRegisterId(pollId, userId) > 0) {
            throw new BusinessException("이미 참여하신 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        String id = "POLRES_" + System.currentTimeMillis();
        pollResultRepository.save(Objects.requireNonNull(OnlinePollResult.builder()
                .pollResultId(id)
                .pollId(pollId)
                .pollIemId(pollIemId)
                .createdBy(userId)
                .build()));
    }

    private void validatePollDates(String beginDe, String endDe) {
        if (beginDe != null && endDe != null) {
            if (beginDe.compareTo(endDe) > 0) {
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", ErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }
}
