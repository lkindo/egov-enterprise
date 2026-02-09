package com.company.project.service.vacation;

import com.company.project.domain.vacation.AnnualLeave;
import com.company.project.domain.vacation.AnnualLeaveRepository;
import com.company.project.service.vacation.dto.AnnualLeaveDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnnualLeaveService implements EgovAnnualLeaveService {

    private final AnnualLeaveRepository annualLeaveRepository;

    @Override
    public AnnualLeaveDto getAnnualLeave(String userId, String occrrncYear) {
        return annualLeaveRepository.findById(new AnnualLeave.AnnualLeaveId(userId, occrrncYear))
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerAnnualLeave(AnnualLeaveDto dto) {
        AnnualLeave annualLeave = AnnualLeave.builder()
                .id(new AnnualLeave.AnnualLeaveId(dto.getUserId(), dto.getOccrrncYear()))
                .occrncYrycCo(dto.getOccrncYrycCo())
                .useYrycCo(dto.getUseYrycCo())
                .remndrYrycCo(dto.getRemndrYrycCo())
                .frstRegisterId(dto.getUserId())
                .lastUpdusrId(dto.getUserId())
                .build();
        annualLeaveRepository.save(annualLeave);
    }

    @Override
    @Transactional
    public void updateAnnualLeaveUsage(String userId, String occrrncYear, double useYrycCo, double remndrYrycCo,
            String lastUpdusrId) {
        annualLeaveRepository.findById(new AnnualLeave.AnnualLeaveId(userId, occrrncYear))
                .ifPresent(al -> al.updateUsage(useYrycCo, remndrYrycCo, lastUpdusrId));
    }

    @Override
    public Page<AnnualLeaveDto> getAnnualLeaveList(String occrrncYear, String userId, Pageable pageable) {
        if (userId == null || userId.isEmpty()) {
            return annualLeaveRepository.findByIdOccrrncYear(occrrncYear, pageable).map(this::convertToDto);
        }
        return annualLeaveRepository.findByIdOccrrncYearAndIdUserIdContaining(occrrncYear, userId, pageable)
                .map(this::convertToDto);
    }

    private final com.company.project.domain.user.UserRepository userRepository;

    private AnnualLeaveDto convertToDto(AnnualLeave al) {
        String userNm = "";
        userNm = userRepository.findById(al.getId().getUserId())
                .map(com.company.project.domain.user.User::getUserNm)
                .orElse("");

        return AnnualLeaveDto.builder()
                .userId(al.getId().getUserId())
                .occrrncYear(al.getId().getOccrrncYear())
                .occrncYrycCo(al.getOccrncYrycCo())
                .useYrycCo(al.getUseYrycCo())
                .remndrYrycCo(al.getRemndrYrycCo())
                .userNm(userNm)
                .build();
    }
}
