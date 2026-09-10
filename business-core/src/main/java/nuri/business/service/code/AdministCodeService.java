package nuri.business.service.code;

import nuri.business.domain.code.AdministCode;
import nuri.business.repository.code.AdministCodeRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.dto.AdministCodeDto;
import nuri.business.domain.code.exception.CodeErrorCode;
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

        AdministCode entity = AdministCode.builder()
                .admdstCd(dto.getAdmdstCd())
                .admdstSeCd(dto.getAdmdstSeCd())
                .admdstZoneNm(dto.getAdmdstZoneNm())
                .upAdmdstCd(dto.getUpAdmdstCd())
                .useYn(dto.getUseYn())
                .crtYmd(dto.getCrtYmd())
                .build();
        return administCodeRepository.save(entity).getAdmdstCd();
    }

    @Transactional
    public void updateAdministCode(String code, AdministCodeDto dto, String userId) {
        SecurityUtil.assertPermission("ADMCODE_UPDATE");

        AdministCode entity = administCodeRepository.findById(code)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "행정구역 코드를 찾을 수 없습니다: " + code));
        entity.update(dto.getAdmdstSeCd(), dto.getAdmdstZoneNm(), dto.getUpAdmdstCd(), dto.getUseYn(), userId);
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
     *   <li>이 코드를 상위로 두는 하위 코드가 있으면 거부한다 — {@code tb_admdst_cd} 에는
     *       자기참조 FK 가 없어 DB 가 막지 않으므로, 지우면 하위가 존재하지 않는 상위를
     *       가리킨 채 남는다(권한 삭제가 사용자 할당을 남기던 GAP-AUTH-002 와 같은 모양).</li>
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
                .upAdmdstCd(entity.getUpAdmdstCd())
                .useYn(entity.getUseYn())
                .crtYmd(entity.getCrtYmd())
                .ablYmd(entity.getAblYmd())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .build();
    }
}
