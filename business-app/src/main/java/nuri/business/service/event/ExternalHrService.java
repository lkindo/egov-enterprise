package nuri.business.service.event;

import nuri.business.domain.event.ExternalHr;
import nuri.business.domain.event.ExternalHrId;
import nuri.business.domain.event.ExternalHrRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.event.dto.ExternalHrDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExternalHrService {

    private final ExternalHrRepository externalHrRepository;

    /**
     * 외부인사 목록 조회(페이징). 성명(name)이 주어지면 부분일치 검색한다.
     * 목록 응답은 컨트롤러에서 {@code PageResponse.of(...)} 로 표준화된다.
     */
    public Page<ExternalHrDto> getExternalHrList(String name, Pageable pageable) {
        Pageable page = Objects.requireNonNull(pageable);
        if (name == null || name.trim().isEmpty()) {
            return externalHrRepository.findAll(page).map(this::convertToDto);
        }
        return externalHrRepository.findByOtsdHrNmContaining(name, page).map(this::convertToDto);
    }

    @Transactional
    public ExternalHrDto createExternalHr(ExternalHrDto dto) {
        SecurityUtil.assertPermission("EXT_HR_CREATE");
        requireContactFormats(dto);
        String actorLoginId = currentLoginId();
        ExternalHrId id = new ExternalHrId(dto.getEvntSn(), dto.getOtsdHrId());
        if (externalHrRepository.existsById(id)) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 등록된 외부인사입니다.");
        }
        ExternalHr hr = ExternalHr.builder()
                .evntSn(dto.getEvntSn())
                .otsdHrId(dto.getOtsdHrId())
                .otsdHrNm(dto.getOtsdHrNm())
                .gndrCd(dto.getGndrCd())
                .crTypeCd(dto.getCrTypeCd())
                .ogdpInstNm(dto.getOgdpInstNm())
                .brdtYmd(dto.getBrdtYmd())
                .areaNo(dto.getAreaNo())
                .mdTelno(dto.getMdTelno())
                .endTelno(dto.getEndTelno())
                .emlAddr(dto.getEmlAddr())
                .frstRgtrId(actorLoginId)
                .lastMdfrId(actorLoginId)
                .build();
        return convertToDto(externalHrRepository.save(hr));
    }

    /**
     * 외부인사 수정 — 식별자(evntSn·otsdHrId)는 바꾸지 않는다(2026-09-05 DEC-OPS-036).
     * 등록과 같은 ADMIN/SYSTEM 서비스 경계를 지나며, 수정자는 요청 본문이 아니라 인증 주체에서 fail-closed 로
     * 해석한다({@link #currentLoginId()}) — 클라이언트가 스스로를 다른 사람이라 주장할 수 없다.
     */
    @Transactional
    public ExternalHrDto updateExternalHr(Long evntSn, String otsdHrId, ExternalHrDto dto) {
        SecurityUtil.assertPermission("EXT_HR_UPDATE");
        requireContactFormats(dto);
        String actorLoginId = currentLoginId();
        ExternalHr hr = findRequired(evntSn, otsdHrId);
        nuri.foundation.core.util.EntityVersions.assertCurrent(dto.getVersion(), hr.getVersion());
        hr.update(dto.getGndrCd(), dto.getOtsdHrNm(), dto.getCrTypeCd(), dto.getOgdpInstNm(), dto.getBrdtYmd(),
                dto.getAreaNo(), dto.getMdTelno(), dto.getEndTelno(), dto.getEmlAddr(), actorLoginId);
        return convertToDto(hr);
    }

    /** 외부인사 삭제. 없는 대상은 RESOURCE_NOT_FOUND — 조용히 성공으로 끝내지 않는다. 등록·수정과 같은 관리자 경계다. */
    @Transactional
    public void deleteExternalHr(Long evntSn, String otsdHrId) {
        SecurityUtil.assertPermission("EXT_HR_DELETE");
        externalHrRepository.delete(findRequired(evntSn, otsdHrId));
    }

    // 도메인 조각이 점을 담지 않게 해 조각 경계가 하나로 정해진다 — `[^\s@]+\.[^\s@]+` 꼴은 점 위치를 여러 갈래로 시도해
    //   긴 입력에서 다항 시간 역추적이 된다(CodeQL java/polynomial-redos).
    private static final java.util.regex.Pattern EMAIL = java.util.regex.Pattern.compile("^[^\\s@]+@[^\\s@.]+(?:\\.[^\\s@.]+)+$");
    private static final java.util.regex.Pattern TELNO_PART = java.util.regex.Pattern.compile("^\\d{1,4}$");

    /**
     * 값이 있을 때의 형식만 본다(2026-11-14). 화면(ExternalHrClient)은 이메일 형식과 전화번호 숫자를 검사하지만 서버는 길이만 봐서,
     * API·이관으로 들어온 값은 형식이 틀린 채 저장됐다. 필수 여부는 강제하지 않는다 — 최소 필드만 가진 행도 고칠 수 있어야 한다는
     * 결정(DEC-OPS-045)을 지킨다.
     */
    private static void requireContactFormats(ExternalHrDto dto) {
        if (filled(dto.getEmlAddr()) && !EMAIL.matcher(dto.getEmlAddr()).matches()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "이메일 형식이 올바르지 않습니다.");
        }
        for (String part : java.util.Arrays.asList(dto.getAreaNo(), dto.getMdTelno(), dto.getEndTelno())) {
            if (filled(part) && !TELNO_PART.matcher(part).matches()) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "전화번호는 숫자만 입력해 주세요.");
            }
        }
    }

    private static boolean filled(String value) {
        return value != null && !value.isBlank();
    }

    private ExternalHr findRequired(Long evntSn, String otsdHrId) {
        return externalHrRepository
                .findById(new ExternalHrId(Objects.requireNonNull(evntSn), Objects.requireNonNull(otsdHrId)))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    private String currentLoginId() {
        return SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
    }

    private ExternalHrDto convertToDto(ExternalHr hr) {
        return ExternalHrDto.builder()
                .evntSn(hr.getEvntSn())
                .otsdHrId(hr.getOtsdHrId())
                .otsdHrNm(hr.getOtsdHrNm())
                .gndrCd(hr.getGndrCd())
                .crTypeCd(hr.getCrTypeCd())
                .ogdpInstNm(hr.getOgdpInstNm())
                .brdtYmd(hr.getBrdtYmd())
                .areaNo(hr.getAreaNo())
                .mdTelno(hr.getMdTelno())
                .endTelno(hr.getEndTelno())
                .emlAddr(hr.getEmlAddr())
                .frstRgtrId(hr.getFrstRgtrId())
                .crtDt(hr.getCrtDt())
                .lastMdfrId(hr.getLastMdfrId())
                .mdfcnDt(hr.getMdfcnDt())
                .version(hr.getVersion())
                .build();
    }
}
