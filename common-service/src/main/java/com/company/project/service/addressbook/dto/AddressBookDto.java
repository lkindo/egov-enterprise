package com.company.project.service.addressbook.dto;

import com.company.project.domain.addressbook.AddressBook;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 주소록 DTO
 */
@Getter
@Builder
public class AddressBookDto {
    private String adbkId;
    private String adbkNm;
    private String othbcScope;
    private String trgetOrgnztId;
    private String useAt;
    private String wrterId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static AddressBookDto from(AddressBook entity) {
        return AddressBookDto.builder()
                .adbkId(entity.getAdbkId())
                .adbkNm(entity.getAdbkNm())
                .othbcScope(entity.getOthbcScope())
                .trgetOrgnztId(entity.getTrgetOrgnztId())
                .useAt(entity.getUseAt())
                .wrterId(entity.getWrterId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
