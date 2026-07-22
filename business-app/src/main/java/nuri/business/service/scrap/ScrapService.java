package nuri.business.service.scrap;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.business.service.scrap.dto.ScrapMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.util.IdGenerationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScrapService extends BaseAbstractService {

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

    public ScrapDto getScrap(@NonNull String scrapId) {
        Scrap entity = scrapRepository.findById(scrapId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 조회
        return scrapMapper.toDto(entity);
    }

    @Transactional
    public void createScrap(String userId, ScrapDto dto) throws Exception {
        String scrapId = IdGenerationUtil.generateUniqueId("SCRAP_", 14, scrapRepository::existsById);
        // [P0] scrapUrl/scrapExpln/useYn 를 반드시 담는다 — 과거 builder 가 이 3개를 통째로 버려
        // 링크 보관 기능이 구조적으로 무동작이었다(저장된 URL 이 항상 null).
        // bbsId/pstId 는 의도적으로 요청에서 받지 않는다: pst_id 는 tb_bbs_item 을 참조하는 검증된 FK 라
        // 클라이언트 임의 값 주입(mass assignment)은 무결성 오류를 유발한다. 게시글 스크랩 연동이
        // 도입되면 서버가 경로/컨텍스트에서 결정해 넘겨야 한다.
        Scrap entity = Scrap.builder()
                .scrapId(scrapId)
                .scrapNm(dto.getScrapNm())
                .scrapUrl(dto.getScrapUrl())
                .scrapExpln(dto.getScrapExpln())
                .useYn(dto.getUseYn()) // null 이면 엔티티가 "Y" 로 보정
                .build();
        scrapRepository.save(entity);
    }

    @Transactional
    public void updateScrap(String userId, ScrapDto dto) {
        Scrap entity = scrapRepository.findById(Objects.requireNonNull(dto.getScrapId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 수정
        // 요청 DTO 값을 반영한다(과거에는 entity 의 기존 값을 자기 자신에게 재대입해 수정이 무동작이었다).
        // useYn 만은 미전달(null) 시 기존 값을 보존 — 누락된 요청이 목록 필터(useYn='Y')에서 행을 증발시키는 것을 막는다.
        String useYn = dto.getUseYn() != null ? dto.getUseYn() : entity.getUseYn();
        entity.update(dto.getScrapNm(), dto.getScrapUrl(), dto.getScrapExpln(), useYn);
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteScrap(@NonNull String scrapId) {
        Scrap entity = scrapRepository.findById(scrapId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 삭제
        scrapRepository.delete(entity);
    }
}
