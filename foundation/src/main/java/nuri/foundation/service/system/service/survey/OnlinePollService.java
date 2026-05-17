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
import java.util.UUID;
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
        
        String beginDe = normalizeDate(dto.getPollBgngYmd());
        String endDe = normalizeDate(dto.getPollEndYmd());
        validatePollDates(beginDe, endDe);
        
        // Use UUID to guarantee uniqueness in parallel worker environment
        String pollId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        
        OnlinePollManage pollManage = OnlinePollManage.builder()
                .pollId(pollId)
                .pollNm(dto.getPollNm().length() > 100 ? dto.getPollNm().substring(0, 100) : dto.getPollNm())
                .pollBgngYmd(beginDe)
                .pollEndYmd(endDe)
                .pollTypeCd(dto.getPollTypeCd() != null && dto.getPollTypeCd().length() > 12 ? dto.getPollTypeCd().substring(0, 12) : dto.getPollTypeCd())
                .pollDsuseYn(dto.getPollDsuseYn() != null ? dto.getPollDsuseYn() : "N")
                .pollAutoDsuseYn(dto.getPollAutoDsuseYn() != null ? dto.getPollAutoDsuseYn() : "N")
                .pollItems(new ArrayList<>())
                .build();

        String currentUserId = nuri.foundation.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        pollManage.setFrstRegisterId(currentUserId);

        if (dto.getPollItems() != null) {
            for (OnlinePollItemDto itemDto : dto.getPollItems()) {
                String iemId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
                
                OnlinePollItem item = OnlinePollItem.builder()
                        .pollIemId(iemId)
                        .pollManage(pollManage)
                        .pollIemNm(itemDto.getPollIemNm().length() > 100 ? itemDto.getPollIemNm().substring(0, 100) : itemDto.getPollIemNm())
                        .build();
                item.setFrstRegisterId(currentUserId);
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

        String beginDe = normalizeDate(dto.getPollBgngYmd());
        String endDe = normalizeDate(dto.getPollEndYmd());
        validatePollDates(beginDe, endDe);

        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(dto.getPollId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        
        entity.update(dto.getPollNm().length() > 100 ? dto.getPollNm().substring(0, 100) : dto.getPollNm(), 
                beginDe, endDe,
                dto.getPollTypeCd() != null && dto.getPollTypeCd().length() > 12 ? dto.getPollTypeCd().substring(0, 12) : dto.getPollTypeCd(), 
                dto.getPollDsuseYn(), dto.getPollAutoDsuseYn());
        
        String currentUserId = nuri.foundation.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        entity.setLastUpdusrId(currentUserId);

        if (dto.getPollItems() != null) {
            entity.getPollItems().clear();
            for (OnlinePollItemDto itemDto : dto.getPollItems()) {
                String iemId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

                OnlinePollItem item = OnlinePollItem.builder()
                        .pollIemId(iemId)
                        .pollManage(entity)
                        .pollIemNm(itemDto.getPollIemNm().length() > 100 ? itemDto.getPollIemNm().substring(0, 100) : itemDto.getPollIemNm())
                        .build();
                item.setFrstRegisterId(currentUserId);
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
        
        String iemId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        OnlinePollItem item = OnlinePollItem.builder()
                .pollIemId(iemId)
                .pollManage(pollManage)
                .pollIemNm(dto.getPollIemNm().length() > 100 ? dto.getPollIemNm().substring(0, 100) : dto.getPollIemNm())
                .build();
        
        String currentUserId = nuri.foundation.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        item.setFrstRegisterId(currentUserId);
        
        pollItemRepository.save(Objects.requireNonNull(item));
    }

    @Override
    @Transactional
    public void updatePollItem(OnlinePollItemDto dto) {
        OnlinePollItem entity = pollItemRepository.findById(Objects.requireNonNull(dto.getPollIemId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollIemNm().length() > 100 ? dto.getPollIemNm().substring(0, 100) : dto.getPollIemNm());
        
        String currentUserId = nuri.foundation.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        entity.setLastUpdusrId(currentUserId);
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

        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        if (poll.getPollBgngYmd() != null && poll.getPollBgngYmd().compareTo(today) > 0) {
            throw new BusinessException("설문 시작 전입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }
        if (poll.getPollEndYmd() != null && poll.getPollEndYmd().compareTo(today) < 0) {
            throw new BusinessException("이미 종료된 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        if (pollResultRepository.countByPollIdAndFrstRegisterId(pollId, userId) > 0) {
            throw new BusinessException("이미 참여하신 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        String resId = "PR" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);

        OnlinePollResult result = OnlinePollResult.builder()
                .pollResultId(resId)
                .pollId(pollId)
                .pollIemId(pollIemId)
                .build();
        
        String currentUserId = userId;
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        result.setFrstRegisterId(currentUserId);
        
        pollResultRepository.save(Objects.requireNonNull(result));
    }

    private void validatePollDates(String beginDe, String endDe) {
        if (beginDe != null && endDe != null) {
            if (beginDe.compareTo(endDe) > 0) {
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", ErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }

    private String normalizeDate(String date) {
        if (date == null) return null;
        return date.replace("-", "").replace(".", "").replace("/", "");
    }
}
