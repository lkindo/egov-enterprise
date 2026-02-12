package com.company.project.service.adb.dto;

import lombok.*;
import java.util.List;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressBookDto {
    private String adbkId;
    private String adbkNm;
    private String othbcScope;
    private String trgetOrgnztId;
    private String useAt;
    private String wrterId;
    private List<AddressBookUserDto> adbkMan;
    
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
}
