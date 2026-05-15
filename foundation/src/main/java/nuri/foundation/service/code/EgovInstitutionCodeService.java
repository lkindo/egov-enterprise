package nuri.foundation.service.code;

import nuri.foundation.service.code.dto.InstitutionCodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeRecptnDto;
import nuri.foundation.domain.common.BaseSearchDto;
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
