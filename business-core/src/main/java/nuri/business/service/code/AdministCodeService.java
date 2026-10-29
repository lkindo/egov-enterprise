package nuri.business.service.code;

import nuri.business.domain.code.AdministCode;
import nuri.business.repository.code.AdministCodeRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.dto.AdministCodeDto;
import nuri.business.domain.code.exception.CodeErrorCode;
import java.util.HashSet;
import java.util.Set;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AdministCodeService {
    /** 조상 사슬 순회 상한 — 깨진 데이터에서도 멈춘다. */
    private static final int MAX_HIERARCHY_DEPTH = 50;


    private final AdministCodeRepository administCodeRepository;

    public Page<AdministCodeDto> getAdministCodeList(String searchWrd, Pageable pageable) {
        Page<AdministCode> entities;
        if (searchWrd != null && !searchWrd.isEmpty()) {
            entities = administCodeRepository.findByAdmdstZoneNmContaining(searchWrd, pageable);
        } else {
            entities = administCodeRepository.findAll(pageable);
        }
        return entities.map(this::convertToDto);
    }

    public AdministCodeDto getAdministCodeDetail(String code) {
        return administCodeRepository.findById(code)
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(
                        CodeErrorCode.CODE_NOT_FOUND, "행정구역 코드를 찾을 수 없습니다: " + code));
    }

    @Transactional
    public String createAdministCode(AdministCodeDto dto, String userId) {
        SecurityUtil.assertPermission("ADMCODE_CREATE");

        // [2026-09-17] 등록은 신규 전용이다. 이 엔티티는 클라이언트가 보낸 문자열 PK 를 쓰고
        //   @Version 도 Persistable 도 없어 save() 가 persist 가 아니라 merge 로 간다 — 이미 있는
        //   코드로 등록하면 기존 행의 상위·구분·명칭이 조용히 덮인다. 화면은 "등록했다" 고 말하지만
        //   실제로는 남의 행을 바꾼 것이다.
        if (administCodeRepository.existsById(dto.getAdmdstCd())) {
            throw new BusinessException(CodeErrorCode.DUPLICATE_CODE,
                    "이미 등록된 행정구역 코드입니다: " + dto.getAdmdstCd());
        }
        assertHierarchy(dto.getAdmdstCd(), dto.getUpAdmdstCd(), null);

        AdministCode entity = AdministCode.builder()
                .admdstCd(dto.getAdmdstCd())
                .admdstSeCd(dto.getAdmdstSeCd())
                .admdstZoneNm(dto.getAdmdstZoneNm())
                .upAdmdstCd(blankToNull(dto.getUpAdmdstCd()))
                .useYn(dto.getUseYn())
                .crtYmd(dto.getCrtYmd())
                .build();
        administCodeRepository.insert(entity);
        return entity.getAdmdstCd();
    }

    @Transactional
    public void updateAdministCode(String code, AdministCodeDto dto, String userId) {
        SecurityUtil.assertPermission("ADMCODE_UPDATE");

        AdministCode entity = administCodeRepository.findById(code)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "행정구역 코드를 찾을 수 없습니다: " + code));
        assertHierarchy(code, dto.getUpAdmdstCd(), entity.getUpAdmdstCd());
        entity.update(dto.getAdmdstSeCd(), dto.getAdmdstZoneNm(), blankToNull(dto.getUpAdmdstCd()), dto.getUseYn(), userId);
    }

    /**
     * 행정구역 코드 삭제.
     *
     * <p>이 삭제는 <b>물리 삭제</b>다(공통코드 분류·그룹의 {@code useYn='N'} 논리 삭제와 다르다).
     * 그래서 두 가지를 먼저 확인한다.
     *
     * <ol>
     *   <li>없는 코드는 조용히 성공하지 않는다 — 종전 {@code deleteById} 는 대상이 없어도
     *       아무 말 없이 끝나 화면이 "삭제했다" 고 말할 근거가 없었다.</li>
     *   <li>이 코드를 상위로 두는 하위 코드가 있으면 거부한다 — V2_102 의 자기참조 FK 도
     *       참조 중인 부모 삭제를 막지만, 서비스에서 먼저 확인해 하위 코드 건수와 함께
     *       {@code RESOURCE_IN_USE} 를 반환한다.</li>
     * </ol>
     */
    @Transactional
    public void deleteAdministCode(String code) {
        SecurityUtil.assertPermission("ADMCODE_DELETE");

        AdministCode entity = administCodeRepository.findById(code)
                .orElseThrow(() -> new BusinessException(
                        CodeErrorCode.CODE_NOT_FOUND, "행정구역 코드를 찾을 수 없습니다: " + code));

        long children = administCodeRepository.countByUpAdmdstCd(code);
        if (children > 0) {
            throw new BusinessException(
                    CommonErrorCode.RESOURCE_IN_USE,
                    "하위 행정구역 코드 " + children + "건이 이 코드를 상위로 두고 있어 삭제할 수 없습니다. 먼저 하위 코드를 정리해 주세요.");
        }

        administCodeRepository.delete(entity);
    }

    private AdministCodeDto convertToDto(AdministCode entity) {
        return AdministCodeDto.builder()
                .admdstCd(entity.getAdmdstCd())
                .admdstSeCd(entity.getAdmdstSeCd())
                .admdstZoneNm(entity.getAdmdstZoneNm())
                .upAdmdstCd(nullToBlank(entity.getUpAdmdstCd()))
                .useYn(entity.getUseYn())
                .crtYmd(entity.getCrtYmd())
                .ablYmd(entity.getAblYmd())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .build();
    }
    /**
     * 저장 표현과 응답 표현을 각각 고정한다. [2026-09-17]
     *
     * <p><b>저장은 NULL</b> — 화면은 최상위를 빈 문자열로 보내는데(등록 폼의 {@code upAdmdstCd}
     * 기본값이 {@code ''}), 빈 문자열은 NULL 이 아니므로 V2_102 가 추가한
     * {@code fk_tb_admdst_cd_up_admdst_cd} 가 그것을 거부한다. 정규화하지 않으면 상위 없는
     * 시·도를 등록할 수 없게 된다 — DEC-OPS-061 이 푼 필수 제약을 DB 가 다시 거는 셈이다.
     *
     * <p><b>응답은 빈 문자열</b> — 프런트 목록 파서({@code CodeAdminService.requireAdministCode})가
     * {@code upAdmdstCd} 를 문자열로 요구해, null 을 내보내면 행정코드 목록 화면 전체가 예외로 죽는다.
     * 그래서 wire 계약은 종전 그대로 두고 물리 표현만 바꾼다. 둘은 같은 뜻("상위 없음")이다.
     */
    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private static String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    /**
     * 상위 행정구역 지정의 무결성 검사. [2026-09-17]
     *
     * <p>V2_102 의 자기참조 FK 는 새로 쓰는 부모 참조의 존재와 참조 중인 부모 삭제를 보호하지만
     * 순환은 막지 못한다. {@code NOT VALID} 로 추가하고 고아가 없는 경우에만 검증하므로,
     * 기존 데이터에는 존재하지 않는 조상을 가리키는 행이 남아 있을 수 있다.
     *
     * <p>⚠ 빈 값은 최상위다. 이 화면은 상위 없는 시·도를 등록할 수 있어야 하므로 그대로 통과시킨다
     * (DEC-OPS-061 이 푼 필수 제약을 다시 걸지 않는다). 저장은 {@link #blankToNull}, 응답은
     * {@link #nullToBlank} 로 변환해 프런트 문자열 계약과 DB 의 NULL 표현을 함께 지킨다.
     *
     * <p>순환은 FK 로 막지 못한다. 조상 사슬을 거슬러 자기 자신에 닿으면 거부하며, 이미 순환이
     * 들어가 있는 데이터에서도 멈추도록 방문 집합과 깊이 상한을 함께 둔다. 새 상위 연결은 상한 안에
     * 검증을 끝내지 못하면 거부한다. 기존 상위를 유지하면 상한 초과에 따른 거부만 면제하며,
     * 탐색 중 발견한 순환 등 기존 검사는 유지한다.
     */
    private void assertHierarchy(String code, String upAdmdstCd, String currentUpAdmdstCd) {
        if (upAdmdstCd == null || upAdmdstCd.isBlank()) {
            return; // 최상위
        }
        if (upAdmdstCd.equals(code)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "자기 자신을 상위 행정구역으로 지정할 수 없습니다: " + code);
        }
        if (!administCodeRepository.existsById(upAdmdstCd)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND,
                    "상위 행정구역 코드를 찾을 수 없습니다: " + upAdmdstCd);
        }
        Set<String> visited = new HashSet<>();
        String ancestor = upAdmdstCd;
        for (int depth = 0; depth < MAX_HIERARCHY_DEPTH && ancestor != null; depth++) {
            if (ancestor.equals(code)) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "상위 행정구역이 순환합니다: " + code + " → " + upAdmdstCd);
            }
            if (!visited.add(ancestor)) {
                return; // 기존 데이터에 이미 있는 순환 — 이 요청이 만든 것이 아니므로 통과시킨다.
            }
            ancestor = administCodeRepository.findById(ancestor)
                    .map(AdministCode::getUpAdmdstCd)
                    .map(AdministCodeService::blankToNull)
                    .orElse(null);
        }
        if (ancestor != null && !upAdmdstCd.equals(currentUpAdmdstCd)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "상위 행정구역 계층이 " + MAX_HIERARCHY_DEPTH + "단계를 넘어 순환 여부를 확인할 수 없습니다: "
                            + code + " → " + upAdmdstCd);
        }
    }
}
