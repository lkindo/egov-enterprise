package com.company.project.business.service.addressbook.dto;

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

    // Manual getters to test
    public String getAdbkId() {
        return adbkId;
    }

    public String getAdbkNm() {
        return adbkNm;
    }

    public String getOthbcScope() {
        return othbcScope;
    }

    public String getTrgetOrgnztId() {
        return trgetOrgnztId;
    }

    public String getUseAt() {
        return useAt;
    }

    public String getWrterId() {
        return wrterId;
    }

    public List<AddressBookUserDto> getAdbkMan() {
        return adbkMan;
    }

    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    public LocalDateTime getFrstRegistPnttm() {
        return frstRegistPnttm;
    }

    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    public LocalDateTime getLastUpdtPnttm() {
        return lastUpdtPnttm;
    }
}
