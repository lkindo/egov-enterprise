package nuri.business.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.survey.OnlinePollManage;
import nuri.business.domain.survey.OnlinePollArticle;
import nuri.business.domain.survey.OnlinePollResult;
import nuri.business.domain.survey.OnlinePollManageRepository;
import nuri.business.domain.survey.OnlinePollArticleRepository;
import nuri.business.domain.survey.OnlinePollResultRepository;
import nuri.business.service.survey.dto.OnlinePollArticleDto;
import nuri.business.service.survey.dto.OnlinePollManageDto;
import nuri.business.service.survey.dto.OnlinePollArticleMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OnlinePollService {

    private final OnlinePollManageRepository pollManageRepository;
    private final OnlinePollArticleRepository pollItemRepository;
    private final OnlinePollResultRepository pollResultRepository;
    private final OnlinePollArticleMapper onlinePollArticleMapper;

    public Page<OnlinePollManageDto> getPollList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        Page<OnlinePollManage> entities;
        String searchKeyword = (keyword == null) ? "" : keyword;
        if (searchKeyword.isEmpty()) {
            entities = pollManageRepository.findAll(pageable);
        } else {
            entities = pollManageRepository.findByPollNmContaining(searchKeyword, pageable);
        }

        // from() 은 스칼라 필드만 채우고, 항목(pollArticles)은 OnlinePollArticleMapper 로 매핑한다
        // (수기 OnlinePollArticleDto.from() 제거 — 매핑 단일화).
        Page<OnlinePollManageDto> dtoPage = entities.map(entity -> {
            OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
            if (entity.getPollArticles() != null) {
                dto.setPollArticles(entity.getPollArticles().stream()
                        .map(onlinePollArticleMapper::toDto)
                        .collect(Collectors.toList()));
            }
            return dto;
        });
        // 페이지 내 모든 항목의 투표수를 단일 배치 쿼리로 채운다(항목마다 count 하던 N+1 제거).
        List<OnlinePollArticleDto> allItems = dtoPage.getContent().stream()
                .map(dto -> dto.getPollArticles())
                .filter(Objects::nonNull)
                .flatMap(list -> list.stream())
                .collect(Collectors.toList());
        applyItemVoteCounts(allItems);

        String currentLoginId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse(null);
        boolean isAdmin = nuri.business.security.util.SecurityUtil.hasPermission("POLL_READ_ALL");

        // hasVoted 는 '내가 참여했는가' 이므로 관리자에게도 사실대로 채운다. 관리자 여부는
        // 득표수 은닉에만 쓰인다 — 두 축을 묶으면 관리자의 hasVoted 가 항상 false 인 거짓이 된다.
        Set<Long> votedPollSns = new HashSet<>();
        if (currentLoginId != null) {
            List<Long> pollSns = dtoPage.getContent().stream()
                    .map(OnlinePollManageDto::getPollSn)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            if (!pollSns.isEmpty()) {
                votedPollSns.addAll(pollResultRepository.findVotedPollSnsByLoginId(pollSns, currentLoginId));
            }
        }

        String today = today();
        Map<Long, OnlinePollManage> entityByPollSn = new HashMap<>();
        entities.getContent().forEach(entity -> entityByPollSn.put(entity.getPollSn(), entity));

        for (OnlinePollManageDto dto : dtoPage.getContent()) {
            boolean hasVoted = votedPollSns.contains(dto.getPollSn());
            dto.setHasVoted(hasVoted);
            if (hidesVoteCounts(entityByPollSn.get(dto.getPollSn()), hasVoted, isAdmin, today)) {
                maskVoteCounts(dto.getPollArticles());
            }
        }

        return dtoPage;
    }

    /** 항목별 투표수(pollIemCo)를 단일 배치 집계로 채운다. */
    private void applyItemVoteCounts(List<OnlinePollArticleDto> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        List<Long> artclSns = items.stream()
                .map(item -> item.getPollArtclSn())
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (artclSns.isEmpty()) {
            return;
        }
        Map<Long, Long> countByArtcl = new HashMap<>();
        for (Object[] row : pollResultRepository.countByPollArtclSnIn(artclSns)) {
            countByArtcl.put((Long) row[0], (Long) row[1]);
        }
        items.forEach(item -> item.setPollIemCo(countByArtcl.getOrDefault(item.getPollArtclSn(), 0L)));
    }

    public OnlinePollManageDto getPoll(Long pollSn) {
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(pollSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        OnlinePollManageDto dto = OnlinePollManageDto.from(entity);

        boolean hasVoted = hasVoted(pollSn);
        dto.setHasVoted(hasVoted);

        List<OnlinePollArticleDto> items = loadPollItems(pollSn);
        if (hidesVoteCounts(entity, hasVoted, nuri.business.security.util.SecurityUtil.hasPermission("POLL_READ_ALL"), today())) {
            maskVoteCounts(items);
        }
        dto.setPollArticles(items);
        return dto;
    }

    @Transactional
    public void insertPoll(OnlinePollManageDto dto) {
        nuri.business.security.util.SecurityUtil.assertPermission("POLL_CREATE");
        
        String beginDe = normalizeDate(dto.getPollBgngYmd());
        String endDe = normalizeDate(dto.getPollEndYmd());
        validatePollDates(beginDe, endDe);
        
        OnlinePollManage pollManage = OnlinePollManage.builder()
                .pollNm(dto.getPollNm().length() > 100 ? dto.getPollNm().substring(0, 100) : dto.getPollNm())
                .pollBgngYmd(beginDe)
                .pollEndYmd(endDe)
                .pollKndCd(dto.getPollKndCd() != null && dto.getPollKndCd().length() > 12 ? dto.getPollKndCd().substring(0, 12) : dto.getPollKndCd())
                .pollDsuseYn(dto.getPollDsuseYn() != null ? dto.getPollDsuseYn() : "N")
                .pollAtmcDsuseYn(dto.getPollAtmcDsuseYn() != null ? dto.getPollAtmcDsuseYn() : "N")
                .pollArticles(new ArrayList<>())
                .build();

        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        pollManage.setFrstRgtrId(currentUserId);

        if (dto.getPollArticles() != null) {
            for (OnlinePollArticleDto itemDto : dto.getPollArticles()) {
                OnlinePollArticle item = OnlinePollArticle.builder()
                        .pollManage(pollManage)
                        .pollArtclNm(itemDto.getPollArtclNm().length() > 100 ? itemDto.getPollArtclNm().substring(0, 100) : itemDto.getPollArtclNm())
                        .build();
                item.setFrstRgtrId(currentUserId);
                pollManage.getPollArticles().add(item);
            }
        }

        pollManageRepository.save(pollManage);
    }

    @Transactional
    public void updatePoll(OnlinePollManageDto dto) {
        nuri.business.security.util.SecurityUtil.assertPermission("POLL_UPDATE");

        String beginDe = normalizeDate(dto.getPollBgngYmd());
        String endDe = normalizeDate(dto.getPollEndYmd());
        validatePollDates(beginDe, endDe);

        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(dto.getPollSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        
        /*
         * 자동폐기 여부(pollAtmcDsuseYn)는 **요청에 없으면 기존 값을 유지한다.**
         *
         * update 는 전체 치환이고 insert 만 null→"N" 을 보정했는데(아래 insertPoll), 이 필드를 묻는
         * 화면이 하나도 없어 요청에는 언제나 빠져 있었다. 그대로 넘기면 **저장할 때마다 NULL** 이 된다
         * — 컬럼은 NULL 을 받고(V2_0 baseline) CHECK(IN ('Y','N')) 도 NULL 은 통과시키므로 아무것도
         * 실패하지 않는다. 즉 조용한 소실이었다(GAP-POLL-001).
         *
         * ⚠ 여기서 insert 와 같은 "null → N" 보정을 하면 안 된다 — 화면이 값을 안 보내므로 저장마다
         *   'Y'(자동폐기 설정됨)가 'N' 으로 뒤집힌다. NULL 소실을 더 나쁜 결함으로 바꾸는 셈이다.
         *
         * 나머지 다섯 필드는 화면이 전부 실어 보내므로 전체 치환 그대로 둔다. 이 비대칭은 의도이며,
         * 값을 묻는 컨트롤이 생기면 그때 이 분기를 걷는다.
         */
        String atmcDsuseYn = dto.getPollAtmcDsuseYn() != null
                ? dto.getPollAtmcDsuseYn()
                : entity.getPollAtmcDsuseYn();

        entity.update(dto.getPollNm().length() > 100 ? dto.getPollNm().substring(0, 100) : dto.getPollNm(),
                beginDe, endDe,
                dto.getPollKndCd() != null && dto.getPollKndCd().length() > 12 ? dto.getPollKndCd().substring(0, 12) : dto.getPollKndCd(),
                dto.getPollDsuseYn(), atmcDsuseYn);
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        entity.setLastMdfrId(currentUserId);

        if (dto.getPollArticles() != null) {
            entity.getPollArticles().clear();
            for (OnlinePollArticleDto itemDto : dto.getPollArticles()) {
                OnlinePollArticle item = OnlinePollArticle.builder()
                        .pollManage(entity)
                        .pollArtclNm(itemDto.getPollArtclNm().length() > 100 ? itemDto.getPollArtclNm().substring(0, 100) : itemDto.getPollArtclNm())
                        .build();
                item.setFrstRgtrId(currentUserId);
                entity.getPollArticles().add(item);
            }
        }
    }

    @Transactional
    public void deletePoll(Long pollSn) {
        nuri.business.security.util.SecurityUtil.assertPermission("POLL_DELETE");

        // [V2_13 결속] 투표 결과 선정리 — fk_tb_onln_poll_rslt_*(NO ACTION) 하에서 결과 보유 투표 삭제가
        // 409 로 파손되던 기왕 부채 해소 (항목은 pollArticles cascade 가 정리)
        pollResultRepository.deleteByPollSn(pollSn);
        pollManageRepository.deleteById(Objects.requireNonNull(pollSn));
    }

    /**
     * 항목 목록 공개 조회. <b>득표수 은닉이 여기에도 걸린다.</b>
     *
     * <p>[2026-09-07] 종전에는 목록·상세에만 은닉을 걸고 이 경로는 원본 득표수를 그대로 돌려줬다.
     * 그런데 사용자가 실제로 투표하는 화면({@code /admin/survey/polls/participate})이 항목을 읽는
     * 유일한 경로가 바로 이 엔드포인트({@code GET /api/v1/polls/{pollSn}/items})다 — 즉 은닉이
     * 걸리는 경로에는 소비자가 없고, 소비자가 있는 경로에는 은닉이 없었다.
     */
    public List<OnlinePollArticleDto> getPollItemList(Long pollSn) {
        List<OnlinePollArticleDto> items = loadPollItems(pollSn);
        boolean hasVoted = hasVoted(pollSn);
        OnlinePollManage poll = pollManageRepository.findById(Objects.requireNonNull(pollSn)).orElse(null);
        if (hidesVoteCounts(poll, hasVoted, nuri.business.security.util.SecurityUtil.hasPermission("POLL_READ_ALL"), today())) {
            maskVoteCounts(items);
        }
        return items;
    }

    /** 은닉 없이 항목+득표수를 읽는 내부 로더. 공개 경로는 반드시 {@link #getPollItemList} 를 쓴다. */
    private List<OnlinePollArticleDto> loadPollItems(Long pollSn) {
        List<OnlinePollArticleDto> items = pollItemRepository.findByPollManagePollSn(Objects.requireNonNull(pollSn)).stream()
                .map(onlinePollArticleMapper::toDto)
                .collect(Collectors.toList());
        applyItemVoteCounts(items);
        return items;
    }

    /** 현재 인증 주체가 이 투표에 이미 참여했는가. 미인증이면 false. */
    private boolean hasVoted(Long pollSn) {
        return nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .map(loginId -> pollResultRepository.countByPollSnAndFrstRegisterId(pollSn, loginId) > 0)
                .orElse(false);
    }

    /**
     * [밴드웨건 효과 방지] 득표수를 숨길지 판정한다 — <b>진행 중</b>이고, 관리자가 아니며,
     * 아직 참여하지 않았을 때만 숨긴다.
     *
     * <p><b>종료·폐기·시작 전 투표는 숨기지 않는다.</b> 끝난 투표의 결과는 참여하지 않은 사람도
     * 볼 수 있어야 한다 — 여기서 숨기면 미참여자가 결과를 영영 못 보는 회귀가 된다.
     * 기간 판정은 {@link #vote} 와 같은 규칙·같은 시간대(Asia/Seoul)를 쓴다.
     *
     * @param poll 대상 투표(조회 실패 시 {@code null} — 판정 불가이므로 숨기지 않는다)
     */
    private boolean hidesVoteCounts(OnlinePollManage poll, boolean hasVoted, boolean isAdmin, String today) {
        if (isAdmin || hasVoted || poll == null) {
            return false;
        }
        if ("Y".equals(poll.getPollDsuseYn())) {
            return false;
        }
        boolean notStarted = poll.getPollBgngYmd() != null && poll.getPollBgngYmd().compareTo(today) > 0;
        boolean ended = poll.getPollEndYmd() != null && poll.getPollEndYmd().compareTo(today) < 0;
        return !notStarted && !ended;
    }

    /**
     * 득표수를 <b>{@code null}</b> 로 지운다 — 0 이 아니다.
     *
     * <p>0 은 "아무도 고르지 않았다" 는 사실 주장이라, 은닉을 0 으로 표현하면 화면이
     * 전원 0표라고 <b>거짓말</b>하게 된다(만족도 평균이 '평가 없음'을 0.0 으로 뭉개던
     * GAP-API-001 과 같은 모양). {@code null} 은 "말하지 않았다" 이며, 응답 zod 계약이
     * non-required 응답 필드를 nullable 로 받는다(DEC-OPS-028).
     */
    private void maskVoteCounts(List<OnlinePollArticleDto> items) {
        if (items == null) {
            return;
        }
        items.forEach(item -> item.setPollIemCo(null));
    }

    /** 기간 판정 기준일(Asia/Seoul). 설문(SurveyResultService)과 같은 시간대를 쓴다. */
    private static String today() {
        return java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
                .format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
    }

    @Transactional
    public void insertPollItem(OnlinePollArticleDto dto) {
        OnlinePollManage pollManage = pollManageRepository.findById(dto.getPollSn())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        OnlinePollArticle item = OnlinePollArticle.builder()
                .pollManage(pollManage)
                .pollArtclNm(dto.getPollArtclNm().length() > 100 ? dto.getPollArtclNm().substring(0, 100) : dto.getPollArtclNm())
                .build();
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        item.setFrstRgtrId(currentUserId);
        
        pollItemRepository.save(Objects.requireNonNull(item));
    }

    @Transactional
    public void updatePollItem(OnlinePollArticleDto dto) {
        OnlinePollArticle entity = pollItemRepository.findById(Objects.requireNonNull(dto.getPollArtclSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollArtclNm().length() > 100 ? dto.getPollArtclNm().substring(0, 100) : dto.getPollArtclNm());
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        entity.setLastMdfrId(currentUserId);
    }

    @Transactional
    public void deletePollItem(Long pollArtclSn) {
        Objects.requireNonNull(pollArtclSn);
        // [V2_13 결속] 해당 항목 투표 결과 선정리 (fk_tb_onln_poll_rslt_tb_onln_poll_artcl NO ACTION)
        pollResultRepository.deleteByPollArtclSn(pollArtclSn);
        pollItemRepository.deleteById(pollArtclSn);
    }

    @Transactional
    public void vote(Long pollSn, Long pollArtclSn, String userId) {
        OnlinePollManage poll = pollManageRepository.findById(pollSn)
                .orElseThrow(() -> new BusinessException("설문을 찾을 수 없습니다.", CommonErrorCode.RESOURCE_NOT_FOUND));

        if ("Y".equals(poll.getPollDsuseYn())) {
            throw new BusinessException("종료되었거나 폐기된 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        String today = today();
        if (poll.getPollBgngYmd() != null && poll.getPollBgngYmd().compareTo(today) > 0) {
            throw new BusinessException("설문 시작 전입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (poll.getPollEndYmd() != null && poll.getPollEndYmd().compareTo(today) < 0) {
            throw new BusinessException("이미 종료된 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        // 빠른 경로(fast-path): 이미 참여한 사용자면 굳이 INSERT 를 시도하지 않는다.
        // ⚠ 이 검사만으로는 동시 요청 경합(TOCTOU)을 막을 수 없다. 권위 있는 방어는 아래 유니크 제약(V2_4)이다.
        // 식별자 정합: userId 는 컨트롤러가 loginId(SecurityUtil.getCurrentLoginId())를 전달한다.
        // LoginUserAuditorAware 가 감사 컬럼(frstRgtrId)에 기록하는 값도 loginId 이므로,
        // 이 중복 검사와 DB 유니크 제약(V2_4)이 동일한 식별자를 기준으로 동작한다.
        if (!pollItemRepository.existsByPollArtclSnAndPollManagePollSn(pollArtclSn, pollSn)) {
            throw new BusinessException("설문 항목을 찾을 수 없습니다.", CommonErrorCode.RESOURCE_NOT_FOUND);
        }

        if (pollResultRepository.countByPollSnAndFrstRegisterId(pollSn, userId) > 0) {
            throw new BusinessException("이미 참여하신 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        OnlinePollResult result = OnlinePollResult.builder()
                .pollSn(pollSn)
                .pollArtclSn(pollArtclSn)
                .build();

        String currentUserId = userId;
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        result.setFrstRgtrId(currentUserId);

        // saveAndFlush 로 즉시 flush 하여 유니크 제약 위반을 이 트랜잭션 내부에서 잡는다.
        // (save 는 flush 를 커밋 시점까지 지연시켜 예외가 메서드 밖 커밋 단계에서 터진다 → catch 불가.)
        // 경합으로 pre-check 를 통과한 두 번째 INSERT 는 여기서 제약 위반 → 멱등하게 "이미 참여" 로 변환한다.
        // ⚠ 이중투표 유니크 제약 위반만 "이미 참여" 로 변환한다. value-too-long 등 다른 무결성 오류는
        //    그대로 전파하여 "이미 참여" 로 오분류·은폐하지 않는다.
        try {
            pollResultRepository.saveAndFlush(Objects.requireNonNull(result));
        } catch (DataIntegrityViolationException e) {
            if (isDuplicateVoteViolation(e)) {
                throw new BusinessException("이미 참여하신 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
            throw e;
        }
    }

    /** 예외 원인 체인에서 이중투표 유니크 제약({@code uk_tb_onln_poll_rslt_poll_voter}) 위반인지 식별한다. */
    private boolean isDuplicateVoteViolation(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            String msg = t.getMessage();
            if (msg != null && msg.contains("uk_tb_onln_poll_rslt_poll_voter")) {
                return true;
            }
        }
        return false;
    }

    private void validatePollDates(String beginDe, String endDe) {
        if (beginDe != null && endDe != null) {
            if (beginDe.compareTo(endDe) > 0) {
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }

    private String normalizeDate(String date) {
        if (date == null || date.isEmpty()) return null;
        return date.replace("-", "").replace(".", "").replace("/", "");
    }
}
