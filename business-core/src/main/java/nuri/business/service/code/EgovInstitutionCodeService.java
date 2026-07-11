package nuri.business.service.code;

import nuri.business.service.code.dto.InstitutionCodeDto;
import nuri.business.service.code.dto.InstitutionCodeRecptnDto;
import nuri.business.domain.common.BaseSearchDto;
import java.util.List;

public interface EgovInstitutionCodeService {
    List<InstitutionCodeDto> selectInstitutionCodeList(BaseSearchDto searchVO);
    void insertInstitutionCodeRecptn(InstitutionCodeRecptnDto dto);
    void updateInstitutionCodeRecptn(InstitutionCodeRecptnDto dto);
    List<InstitutionCodeRecptnDto> selectInstitutionCodeRecptnList(BaseSearchDto searchVO);
    int selectInstitutionCodeListTotCnt(BaseSearchDto searchVO);
    InstitutionCodeDto selectInstitutionCodeDetail(InstitutionCodeDto dto);
    void insertInstitutionCode(InstitutionCodeDto dto);
    void updateInstitutionCode(InstitutionCodeDto dto);
    void deleteInstitutionCode(InstitutionCodeDto dto);
}
