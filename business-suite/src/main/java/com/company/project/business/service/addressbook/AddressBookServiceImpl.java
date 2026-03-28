package com.company.project.business.service.addressbook;

import com.company.project.business.domain.addressbook.AddressBook;
import com.company.project.business.domain.addressbook.AddressBookRepository;
import com.company.project.business.domain.addressbook.AddressBookUser;
import com.company.project.business.domain.addressbook.AddressBookUserRepository;
import com.company.project.business.service.addressbook.dto.AddressBookDto;
import com.company.project.business.service.addressbook.dto.AddressBookUserDto;
import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AddressBookServiceImpl implements AddressBookService {

    private final AddressBookRepository addressBookRepository;
    private final AddressBookUserRepository addressBookUserRepository;

    @org.springframework.beans.factory.annotation.Qualifier("egovAdbkIdGnrService")
    private final EgovIdGnrService egovAdbkIdGnrService;
    @org.springframework.beans.factory.annotation.Qualifier("egovAdbkUserIdGnrService")
    private final EgovIdGnrService egovAdbkUserIdGnrService;

    @Override
    public Page<AddressBookDto> getAddressBookList(String wrterId, String trgetOrgnztId, String searchCnd,
            String searchWrd, @NonNull Pageable pageable) {
        return addressBookRepository
                .searchAddressBooks(wrterId, trgetOrgnztId, searchCnd, searchWrd, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public AddressBookDto getAddressBook(@NonNull String adbkId) {
        AddressBook entity = addressBookRepository.findById(adbkId)
                .orElseThrow(() -> new BusinessException("주소록을 찾을 수 없습니다: " + adbkId, ErrorCode.RESOURCE_NOT_FOUND));

        AddressBookDto dto = convertToDto(entity);
        List<AddressBookUser> users = addressBookUserRepository.findByAdbkId(adbkId);
        dto.setAdbkMan(users.stream().map(this::convertToUserDto).collect(Collectors.toList()));

        return dto;
    }

    @Override
    @Transactional
    public void createAddressBook(String userId, AddressBookDto dto) {
        try {
            String adbkId = egovAdbkIdGnrService.getNextStringId();
            AddressBook entity = AddressBook.builder()
                    .adbkId(adbkId)
                    .adbkNm(dto.getAdbkNm())
                    .othbcScope(dto.getOthbcScope())
                    .trgetOrgnztId(dto.getTrgetOrgnztId())
                    .useAt("Y")
                    .wrterId(userId)
                    .createdBy(userId)
                    .build();

            addressBookRepository.save(entity);

            if (dto.getAdbkMan() != null) {
                for (AddressBookUserDto userDto : dto.getAdbkMan()) {
                    String adbkUserId = egovAdbkUserIdGnrService.getNextStringId();
                    AddressBookUser userEntity = AddressBookUser.builder()
                            .adbkUserId(adbkUserId)
                            .adbkId(adbkId)
                            .emplyrId(userDto.getEmplyrId())
                            .nm(userDto.getNm())
                            .emailAdres(userDto.getEmailAdres())
                            .homeTelno(userDto.getHomeTelno())
                            .moblphonNo(userDto.getMoblphonNo())
                            .offmTelno(userDto.getOffmTelno())
                            .fxnum(userDto.getFxnum())
                            .build();
                    addressBookUserRepository.save(userEntity);
                }
            }
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Failed to create AddressBook", e);
            throw new BusinessException("주소록 생성 중 오류가 발생했습니다.", ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public void updateAddressBook(String userId, AddressBookDto dto) {
        AddressBook entity = addressBookRepository.findById(Objects.requireNonNull(dto.getAdbkId()))
                .orElseThrow(() -> new BusinessException("수정할 주소록이 존재하지 않습니다.", ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getAdbkNm(), dto.getOthbcScope(), dto.getUseAt());

        if (dto.getAdbkMan() == null) {
            return;
        }

        List<AddressBookUser> existingUsers = addressBookUserRepository.findByAdbkId(dto.getAdbkId());

        for (AddressBookUser existing : existingUsers) {
            boolean remains = dto.getAdbkMan().stream()
                    .anyMatch(u -> (u.getEmplyrId() != null && u.getEmplyrId().equals(existing.getEmplyrId())));
            if (!remains) {
                addressBookUserRepository.delete(existing);
            }
        }

        for (AddressBookUserDto userDto : dto.getAdbkMan()) {
            boolean exists = existingUsers.stream()
                    .anyMatch(u -> (u.getEmplyrId() != null && u.getEmplyrId().equals(userDto.getEmplyrId())));
            if (!exists) {
                try {
                    String adbkUserId = egovAdbkUserIdGnrService.getNextStringId();
                    AddressBookUser newUser = AddressBookUser.builder()
                            .adbkUserId(adbkUserId)
                            .adbkId(dto.getAdbkId())
                            .emplyrId(userDto.getEmplyrId())
                            .nm(userDto.getNm())
                            .emailAdres(userDto.getEmailAdres())
                            .homeTelno(userDto.getHomeTelno())
                            .moblphonNo(userDto.getMoblphonNo())
                            .offmTelno(userDto.getOffmTelno())
                            .fxnum(userDto.getFxnum())
                            .build();
                    addressBookUserRepository.save(newUser);
                } catch (Exception e) {
                    throw new BusinessException("ID 생성 중 오류가 발생했습니다.", ErrorCode.INTERNAL_SERVER_ERROR);
                }
            }
        }
    }

    @Override
    @Transactional
    public void deleteAddressBook(String adbkId, String userId) {
        AddressBook entity = addressBookRepository.findById(adbkId)
                .orElseThrow(() -> new BusinessException("삭제할 주소록이 존재하지 않습니다.", ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(entity.getAdbkNm(), entity.getOthbcScope(), "N");
    }

    @Override
    public Page<AddressBookUserDto> searchUsers(String searchWrd, @NonNull Pageable pageable) {
        return addressBookRepository.searchAddressBookUsers(searchWrd, Objects.requireNonNull(pageable))
                .map(res -> AddressBookUserDto.builder()
                        .emplyrId(res.getEmplyrId())
                        .nm(res.getNm())
                        .emailAdres(res.getEmailAdres())
                        .moblphonNo(res.getMoblphonNo())
                        .offmTelno(res.getOffmTelno())
                        .homeTelno(res.getHomeTelno())
                        .build());
    }

    @Override
    public AddressBookUserDto getAdbkUser(String id) {
        return null;
    }

    private AddressBookDto convertToDto(AddressBook entity) {
        return AddressBookDto.builder()
                .adbkId(entity.getAdbkId())
                .adbkNm(entity.getAdbkNm())
                .othbcScope(entity.getOthbcScope())
                .trgetOrgnztId(entity.getTrgetOrgnztId())
                .useAt(entity.getUseAt())
                .wrterId(entity.getWrterId())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegistPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdtPnttm(entity.getLastModifiedDate())
                .build();
    }

    private AddressBookUserDto convertToUserDto(AddressBookUser entity) {
        return AddressBookUserDto.builder()
                .adbkUserId(entity.getAdbkUserId())
                .adbkId(entity.getAdbkId())
                .emplyrId(entity.getEmplyrId())
                .nm(entity.getNm())
                .emailAdres(entity.getEmailAdres())
                .homeTelno(entity.getHomeTelno())
                .moblphonNo(entity.getMoblphonNo())
                .offmTelno(entity.getOffmTelno())
                .fxnum(entity.getFxnum())
                .build();
    }
}
