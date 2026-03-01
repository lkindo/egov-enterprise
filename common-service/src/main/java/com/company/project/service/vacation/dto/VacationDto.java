package com.company.project.service.vacation.dto;

import com.company.project.domain.vacation.Vacation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationDto {
    private String applcntId;

    @NotBlank(message = "?��?구분?� ?�수 ?�력 ??��?�니??")
    @Size(max = 2)
    private String vcatnSe;

    @NotBlank(message = "?�작?��? ?�수 ?�력 ??��?�니??")
    @Size(max = 8)
    private String bgnde;

    @NotBlank(message = "종료?��? ?�수 ?�력 ??��?�니??")
    @Size(max = 8)
    private String endde;

    @Size(max = 2500)
    private String vcatnResn;

    private String reqstDe;

    @NotBlank(message = "발생?�도???�수 ?�력 ??��?�니??")
    @Size(max = 4)
    private String occrrncYear;

    private String noonSe;
    private String sanctnerId;
    private String confmAt;
    private String sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
    private String frstRegisterId;
    private String frstRegisterPnttm;

    public static VacationDto from(Vacation entity) {
        if (entity == null)
            return null;
        return VacationDto.builder()
                .applcntId(entity.getApplcntId())
                .vcatnSe(entity.getVcatnSe())
                .bgnde(entity.getBgnde())
                .endde(entity.getEndde())
                .vcatnResn(entity.getVcatnResn())
                .reqstDe(entity.getReqstDe())
                .occrrncYear(entity.getOccrrncYear())
                .noonSe(entity.getNoonSe())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
