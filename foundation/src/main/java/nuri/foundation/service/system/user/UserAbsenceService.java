package nuri.foundation.service.system.user;

import nuri.foundation.domain.user.dto.UserAbsenceDto;
import java.util.List;

public interface UserAbsenceService {
    List<UserAbsenceDto> getAbsences();
    UserAbsenceDto getAbsence(String emplyrId);
    void updateAbsence(String emplyrId, UserAbsenceDto dto);
}
