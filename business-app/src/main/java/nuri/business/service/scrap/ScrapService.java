package nuri.business.service.scrap;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.business.service.scrap.dto.ScrapMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.security.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.jspecify.annotations.NonNull;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScrapService {

    private static final String DUPLICATE_SCRAP_MESSAGE = "이미 같은 주소를 스크랩했습니다. 스크랩 보관함에서 확인해 주세요.";

    private final ScrapRepository scrapRepository;
    /** 엔티티↔DTO 매핑 단일 창구(MapStruct). 수기 매핑의 필드 누락(스크랩 URL/설명 소실) 재발 방지. */
    private final ScrapMapper scrapMapper;

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
        if (dto.getScrapUrl() != null) {
            List<Scrap> sameTarget = scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc(userId, dto.getScrapUrl());
            if (sameTarget.stream().anyMatch(s -> "Y".equals(s.getUseYn()))) {
                throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, DUPLICATE_SCRAP_MESSAGE);
            }
            if (!sameTarget.isEmpty()) {
                Scrap previous = sameTarget.get(0);
                previous.update(dto.getScrapNm(), dto.getScrapUrl(), dto.getScrapExpln(),
                        dto.getUseYn() != null ? dto.getUseYn() : "Y");
                previous.setLastMdfrId(userId);
                return previous.getScrapSn();
            }
        }
        // [P0] scrapUrl/scrapExpln/useYn 를 반드시 담는다 — 과거 builder 가 이 3개를 통째로 버려
        // 링크 보관 기능이 구조적으로 무동작이었다(저장된 URL 이 항상 null).
        // bbsId/pstSn 는 의도적으로 요청에서 받지 않는다: pst_sn 는 tb_bbs_item 을 참조하는 검증된 FK 라
        // 클라이언트 임의 값 주입(mass assignment)은 무결성 오류를 유발한다. 게시글 스크랩 연동이
        // 도입되면 서버가 경로/컨텍스트에서 결정해 넘겨야 한다.
        Scrap entity = Scrap.builder()
                .scrapNm(dto.getScrapNm())
                .scrapUrl(dto.getScrapUrl())
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
        // 요청 DTO 값을 반영한다(과거에는 entity 의 기존 값을 자기 자신에게 재대입해 수정이 무동작이었다).
        // useYn 만은 미전달(null) 시 기존 값을 보존 — 누락된 요청이 목록 필터(useYn='Y')에서 행을 증발시키는 것을 막는다.
        String useYn = dto.getUseYn() != null ? dto.getUseYn() : entity.getUseYn();
        // [2026-10-19] 주소를 바꿔 같은 사용자의 다른 스크랩과 겹치면 409 — 등록과 같은 1인 1주소 규칙이다.
        //   겹침은 스크랩 주인(frstRgtrId) 기준이다. 대리 수정하는 관리자의 보관함이 아니다.
        if (dto.getScrapUrl() != null && !dto.getScrapUrl().equals(entity.getScrapUrl())
                && scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc(entity.getFrstRgtrId(), dto.getScrapUrl())
                        .stream().anyMatch(other -> !other.getScrapSn().equals(entity.getScrapSn()))) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, DUPLICATE_SCRAP_MESSAGE);
        }
        entity.update(dto.getScrapNm(), dto.getScrapUrl(), dto.getScrapExpln(), useYn);
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteScrap(@NonNull Long scrapSn) {
        Scrap entity = scrapRepository.findById(scrapSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "SCRAP_DELETE_ALL"); // [IDOR] 소유자/관리자만 삭제
        scrapRepository.delete(entity);
    }
}
