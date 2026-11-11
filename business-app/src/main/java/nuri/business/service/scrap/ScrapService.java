package nuri.business.service.scrap;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.business.service.scrap.dto.ScrapMapper;
import nuri.foundation.core.board.BoardPostAccessPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.util.SafeUrls;
import nuri.business.security.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ScrapService {

    private static final String DUPLICATE_SCRAP_MESSAGE = "이미 같은 주소를 스크랩했습니다. 스크랩 보관함에서 확인해 주세요.";
    private static final String INVALID_SCRAP_URL_MESSAGE = "안전한 참조 URL 형식이 아닙니다.";
    private static final String INVALID_BOARD_SCRAP_URL_MESSAGE = "유효한 게시글 참조 URL 형식이 아닙니다.";
    private static final int MAX_BBS_ID_LENGTH = 20;

    private final ScrapRepository scrapRepository;
    /** 엔티티↔DTO 매핑 단일 창구(MapStruct). 수기 매핑의 필드 누락(스크랩 URL/설명 소실) 재발 방지. */
    private final ScrapMapper scrapMapper;
    private final @Nullable BoardPostAccessPort boardPostAccess;

    @Autowired
    public ScrapService(
            ScrapRepository scrapRepository,
            ScrapMapper scrapMapper,
            @Nullable BoardPostAccessPort boardPostAccess) {
        this.scrapRepository = scrapRepository;
        this.scrapMapper = scrapMapper;
        this.boardPostAccess = boardPostAccess;
    }

    ScrapService(ScrapRepository scrapRepository, ScrapMapper scrapMapper) {
        this(scrapRepository, scrapMapper, null);
    }

    public Page<ScrapDto> getScrapList(String userId, @NonNull Pageable pageable) {
        return scrapRepository
                .findByFrstRgtrIdAndUseYn(Objects.requireNonNull(userId), "Y", Objects.requireNonNull(pageable))
                .map(scrapMapper::toDto);
    }

    /** getMyScrapList 별칭 — getScrapList 위임(하위호환). */
    public Page<ScrapDto> getMyScrapList(String userId, @NonNull Pageable pageable) {
        return getScrapList(userId, pageable);
    }

    public ScrapDto getScrap(@NonNull Long scrapSn) {
        Scrap entity = scrapRepository.findById(scrapSn)
                .filter(s -> "Y".equals(s.getUseYn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "SCRAP_READ_ALL"); // [IDOR] 소유자/관리자만 조회
        return scrapMapper.toDto(entity);
    }

    /**
     * 스크랩 등록. 한 사용자는 같은 주소를 하나만 보관한다.
     *
     * <p>[2026-10-19] 종전에는 중복 판정이 없어 같은 글의 스크랩 버튼을 누를 때마다 보관함 행이 하나씩 늘었다
     * (화면은 '이번 방문에서 한 번' 잠금만 걸었다). 이미 사용 중인 같은 주소의 스크랩이 있으면 409 이고, 사용 안 함(N)으로
     * 둔 같은 주소의 스크랩이 있으면 그 행을 새 이름·설명으로 되살린다 — DB 유일 제약
     * ({@code uk_tb_bbs_scrap_frst_rgtr_id_scrap_url})이 사용 안 함 행도 세기 때문이다(만족도 1인 1건과 같은 규칙).
     * 주소가 없는 스크랩(NULL)은 대상을 알 수 없어 겹침을 보지 않는다(DB 도 NULL 끼리 충돌하지 않는다).
     *
     * @param userId 등록자 loginId — 저장 감사값(frstRgtrId)과 같은 축
     */
    @Transactional
    public Long createScrap(String userId, ScrapDto dto) {
        String normalizedUrl = normalizeAndValidateUrl(dto.getScrapUrl());
        if (normalizedUrl != null) {
            List<Scrap> sameTarget = scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc(userId, normalizedUrl);
            if (sameTarget.stream().anyMatch(s -> "Y".equals(s.getUseYn()))) {
                throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, DUPLICATE_SCRAP_MESSAGE);
            }
            verifyBoardTargetIfInternal(normalizedUrl);
            if (!sameTarget.isEmpty()) {
                Scrap previous = sameTarget.get(0);
                previous.update(dto.getScrapNm(), normalizedUrl, dto.getScrapExpln(),
                        dto.getUseYn() != null ? dto.getUseYn() : "Y");
                previous.setLastMdfrId(userId);
                return previous.getScrapSn();
            }
        }
        // [P0] scrapUrl/scrapExpln/useYn 를 반드시 담는다 — 과거 builder 가 이 3개를 통째로 버려
        // 링크 보관 기능이 구조적으로 무동작이었다(저장된 URL 이 항상 null).
        // bbsId/pstSn 는 요청 본문을 신뢰하지 않으며(mass assignment 차단), 수정 시 URL 변경과 함께
        // Scrap.update 가 원자적으로 갱신할 수 있을 때까지(Wave 2 엔티티 변경) null 로 일관되게 유지해
        // scrapUrl 과 FK(pst_sn) 불일치를 막는다. 내부 게시글 경로의 열람 권한 검증은 위에서 선행한다.
        Scrap entity = Scrap.builder()
                .scrapNm(dto.getScrapNm())
                .scrapUrl(normalizedUrl)
                .scrapExpln(dto.getScrapExpln())
                .useYn(dto.getUseYn()) // null 이면 엔티티가 "Y" 로 보정
                .build();
        return scrapRepository.save(entity).getScrapSn();
    }

    @Transactional
    public void updateScrap(Long scrapSn, String userId, ScrapDto dto) {
        Scrap entity = scrapRepository.findById(Objects.requireNonNull(scrapSn))
                .filter(s -> "Y".equals(s.getUseYn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "SCRAP_UPDATE_ALL"); // [IDOR] 소유자/관리자만 수정
        String normalizedUrl = normalizeAndValidateUrl(dto.getScrapUrl());
        boolean urlChanged = !java.util.Objects.equals(normalizedUrl, entity.getScrapUrl());
        // 대상 URL 이 바뀔 때만 내부 게시글 열람 권한을 검증한다 — 이미 보관한 게시글이 나중에 마감·삭제돼도
        // 스크랩 제목·설명 수정은 막히지 않게 한다.
        if (urlChanged) {
            verifyBoardTargetIfInternal(normalizedUrl);
        }
        // 요청 DTO 값을 반영한다(과거에는 entity 의 기존 값을 자기 자신에게 재대입해 수정이 무동작이었다).
        // useYn 만은 미전달(null) 시 기존 값을 보존 — 누락된 요청이 목록 필터(useYn='Y')에서 행을 증발시키는 것을 막는다.
        String useYn = dto.getUseYn() != null ? dto.getUseYn() : entity.getUseYn();
        // [2026-10-19] 주소를 바꿔 같은 사용자의 다른 스크랩과 겹치면 409 — 등록과 같은 1인 1주소 규칙이다.
        //   겹침은 스크랩 주인(frstRgtrId) 기준이다. 대리 수정하는 관리자의 보관함이 아니다.
        if (normalizedUrl != null && urlChanged
                && scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc(entity.getFrstRgtrId(), normalizedUrl)
                        .stream().anyMatch(other -> !other.getScrapSn().equals(entity.getScrapSn()))) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, DUPLICATE_SCRAP_MESSAGE);
        }
        entity.update(dto.getScrapNm(), normalizedUrl, dto.getScrapExpln(), useYn);
        entity.setLastMdfrId(userId);
    }

    private static @Nullable String normalizeAndValidateUrl(@Nullable String rawUrl) {
        if (rawUrl == null) {
            return null;
        }
        if (rawUrl.chars().anyMatch(ch -> Character.isISOControl(ch) || ch == '\\')) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_SCRAP_URL_MESSAGE);
        }
        String stripped = rawUrl.strip();
        if (stripped.isEmpty()) {
            return null;
        }
        if (!SafeUrls.isLinkable(stripped)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_SCRAP_URL_MESSAGE);
        }
        return stripped;
    }

    /**
     * 사이트 내 상대 경로({@code /...}) 가운데 게시판 게시글을 가리키는 경로·쿼리만 추려 열람 가능 여부를 검증한다.
     * fragment({@code #...}) 뒤는 서버 라우팅 대상이 아니므로 버리고, {@code http(s)://} 절대 URL 은 외부 링크로 취급한다.
     */
    private void verifyBoardTargetIfInternal(@Nullable String normalizedUrl) {
        if (normalizedUrl == null || !normalizedUrl.startsWith("/")) {
            return;
        }
        int fragmentIdx = normalizedUrl.indexOf('#');
        String withoutFragment = fragmentIdx >= 0 ? normalizedUrl.substring(0, fragmentIdx) : normalizedUrl;
        int queryIdx = withoutFragment.indexOf('?');
        String path = queryIdx >= 0 ? withoutFragment.substring(0, queryIdx) : withoutFragment;
        String query = queryIdx >= 0 ? withoutFragment.substring(queryIdx + 1) : "";

        String lowerPath = path.toLowerCase(Locale.ROOT);
        boolean explicitBoardPath = lowerPath.equals("/admin/community/boards/detail")
                || lowerPath.startsWith("/admin/community/boards/detail/")
                || lowerPath.startsWith("/cop/bbs/");

        String bbsId = null;
        String postIdRaw = null;
        boolean seenBoardQueryParam = false;

        if (!query.isEmpty()) {
            for (String pair : query.split("&")) {
                if (pair.isEmpty()) {
                    continue;
                }
                int eqIdx = pair.indexOf('=');
                String rawKey = eqIdx >= 0 ? pair.substring(0, eqIdx) : pair;
                String rawVal = eqIdx >= 0 ? pair.substring(eqIdx + 1) : "";
                String key = decodeUrlComponent(rawKey);
                if ("bbsid".equalsIgnoreCase(key)) {
                    seenBoardQueryParam = true;
                    String decoded = decodeUrlComponent(rawVal).strip();
                    if (bbsId != null && !bbsId.equals(decoded)) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_BOARD_SCRAP_URL_MESSAGE);
                    }
                    bbsId = decoded;
                } else if ("pstsn".equalsIgnoreCase(key) || "nttid".equalsIgnoreCase(key)) {
                    seenBoardQueryParam = true;
                    String decoded = decodeUrlComponent(rawVal).strip();
                    if (postIdRaw != null && !postIdRaw.equals(decoded)) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_BOARD_SCRAP_URL_MESSAGE);
                    }
                    postIdRaw = decoded;
                }
            }
        }

        if (!explicitBoardPath && !seenBoardQueryParam) {
            return;
        }
        if (bbsId == null || bbsId.isEmpty() || bbsId.length() > MAX_BBS_ID_LENGTH
                || bbsId.chars().anyMatch(Character::isISOControl)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_BOARD_SCRAP_URL_MESSAGE);
        }
        if (postIdRaw == null || !postIdRaw.matches("^[1-9][0-9]{0,18}$")) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_BOARD_SCRAP_URL_MESSAGE);
        }
        final long pstSn;
        try {
            pstSn = Long.parseLong(postIdRaw);
        } catch (NumberFormatException ex) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_BOARD_SCRAP_URL_MESSAGE);
        }

        assertBoardTargetScrapable(bbsId, pstSn);
    }

    private void assertBoardTargetScrapable(String bbsId, long pstSn) {
        if (boardPostAccess == null) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED, "게시글 열람 권한을 확인할 수 없습니다.");
        }
        boardPostAccess.assertScrapablePost(bbsId, pstSn);
    }

    private static String decodeUrlComponent(String raw) {
        try {
            return URLDecoder.decode(raw, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, INVALID_BOARD_SCRAP_URL_MESSAGE);
        }
    }

    @Transactional
    public void deleteScrap(@NonNull Long scrapSn) {
        Scrap entity = scrapRepository.findById(scrapSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "SCRAP_DELETE_ALL"); // [IDOR] 소유자/관리자만 삭제
        scrapRepository.delete(entity);
    }
}
