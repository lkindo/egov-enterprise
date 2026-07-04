package nuri.business.service.code;

import nuri.business.core.softdelete.DisableSoftDelete;
import nuri.business.domain.code.AdministCode;
import nuri.business.repository.code.AdministCodeRepository;
import nuri.business.service.code.dto.AdministCodeDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
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

    @DisableSoftDelete
    public Page<AdministCodeDto> getAdministCodeList(String searchWrd, Pageable pageable) {
        Page<AdministCode> entities;
        if (searchWrd != null && !searchWrd.isEmpty()) {
            entities = administCodeRepository.findByAdmdstZoneNmContaining(searchWrd, pageable);
        } else {
            entities = administCodeRepository.findAll(pageable);
        }
        return entities.map(this::convertToDto);
    }

    @DisableSoftDelete
    public AdministCodeDto getAdministCodeDetail(String code) {
        return administCodeRepository.findById(code)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Transactional
    public String createAdministCode(AdministCodeDto dto, String userId) {
        AdministCode entity = AdministCode.builder()
                .admdstCd(dto.getAdmdstCd())
                .admdstSeCd(dto.getAdmdstSeCd())
                .admdstZoneNm(dto.getAdmdstZoneNm())
                .upAdmdstCd(dto.getUpAdmdstCd())
                .useYn(dto.getUseYn())
                .crtYmd(dto.getCrtYmd())
                .frstRgtrId(userId)
                .build();
        return administCodeRepository.save(entity).getAdmdstCd();
    }

    @Transactional
    public void updateAdministCode(String code, AdministCodeDto dto, String userId) {
        AdministCode entity = administCodeRepository.findById(code)
                .orElseThrow(() -> new IllegalArgumentException("Administrative code not found: " + code));
        entity.update(dto.getAdmdstSeCd(), dto.getAdmdstZoneNm(), dto.getUpAdmdstCd(), dto.getUseYn(), userId);
    }

    @Transactional
    public void deleteAdministCode(String code) {
        // 물리삭제 대신 소프트삭제(use_yn='N'). 읽기 경로가 @DisableSoftDelete 로 비활성 코드도 노출하는 설계이고,
        // 물리삭제 시 자식 up_admdst_cd 참조가 고아가 된다.
        // 존재하지 않는 code 는 과거 deleteById() 와 동일하게 예외로 알린다(조용한 no-op 방지).
        administCodeRepository.findById(code)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND))
                .delete();
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
