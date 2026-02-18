package com.company.project.service.adb;

import com.company.project.domain.addressbook.AddressBook;
import com.company.project.domain.addressbook.AddressBookRepository;
import com.company.project.domain.addressbook.AddressBookUser;
import com.company.project.domain.addressbook.AddressBookUserRepository;
import com.company.project.domain.namecard.NameCard;
import com.company.project.domain.namecard.NameCardRepository;
import com.company.project.service.adb.dto.AddressBookDto;
import com.company.project.service.adb.dto.AddressBookUserDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AddressBookServiceImpl implements AddressBookService {

    private final AddressBookRepository addressBookRepository;
    private final AddressBookUserRepository addressBookUserRepository;
    private final NameCardRepository nameCardRepository;
    private final EgovIdGnrService egovAdbkIdGnrService;
    private final EgovIdGnrService egovAdbkUserIdGnrService;

    @Override
    public Page<AddressBookDto> getAddressBookList(String wrterId, String trgetOrgnztId, String searchCnd,
            String searchWrd, @NonNull Pageable pageable) {
        return addressBookRepository.searchAddressBooks(wrterId, trgetOrgnztId, searchCnd, searchWrd, pageable)
                .map(this::convertToDto);
    }

    @Override
    public AddressBookDto getAddressBook(@NonNull String adbkId) {
        AddressBook entity = addressBookRepository.findById(adbkId)
                .orElseThrow(() -> new IllegalArgumentException("AddressBook not found: " + adbkId));

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
                    .frstRegisterId(userId)
                    .build();

            addressBookRepository.save(Objects.requireNonNull(entity));

            if (dto.getAdbkMan() != null) {
                for (AddressBookUserDto userDto : dto.getAdbkMan()) {
                    String adbkUserId = egovAdbkUserIdGnrService.getNextStringId();
                    AddressBookUser userEntity = AddressBookUser.builder()
                            .adbkUserId(adbkUserId)
                            .adbkId(adbkId)
                            .emplyrId(userDto.getEmplyrId())
                            .ncrdId(userDto.getNcrdId())
                            .nm(userDto.getNm())
                            .emailAdres(userDto.getEmailAdres())
                            .homeTelno(userDto.getHomeTelno())
                            .moblphonNo(userDto.getMoblphonNo())
                            .offmTelno(userDto.getOffmTelno())
                            .fxnum(userDto.getFxnum())
                            .build();
                    addressBookUserRepository.save(Objects.requireNonNull(userEntity));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to create AddressBook", e);
        }
    }

    @Override
    @Transactional
    public void updateAddressBook(String userId, AddressBookDto dto) {
        AddressBook entity = addressBookRepository.findById(Objects.requireNonNull(dto.getAdbkId()))
                .orElseThrow(() -> new IllegalArgumentException("AddressBook not found: " + dto.getAdbkId()));

        entity.update(dto.getAdbkNm(), dto.getOthbcScope(), dto.getUseAt(), Objects.requireNonNull(userId));

        if (dto.getAdbkMan() == null) {
            return;
        }

        // Handle users update (Simplified logic: delete missing, add new)
        List<AddressBookUser> existingUsers = addressBookUserRepository.findByAdbkId(dto.getAdbkId());

        // Delete users not in the new list
        for (AddressBookUser existing : existingUsers) {
            boolean remains = dto.getAdbkMan().stream()
                    .anyMatch(u -> (u.getEmplyrId() != null && u.getEmplyrId().equals(existing.getEmplyrId())) ||
                            (u.getNcrdId() != null && u.getNcrdId().equals(existing.getNcrdId())));
            if (!remains) {
                addressBookUserRepository.delete(Objects.requireNonNull(existing));
            }
        }

        // Add new users
        for (AddressBookUserDto userDto : dto.getAdbkMan()) {
            boolean exists = existingUsers.stream()
                    .anyMatch(u -> (u.getEmplyrId() != null && u.getEmplyrId().equals(userDto.getEmplyrId())) ||
                            (u.getNcrdId() != null && u.getNcrdId().equals(userDto.getNcrdId())));
            if (!exists) {
                try {
                    String adbkUserId = egovAdbkUserIdGnrService.getNextStringId();
                    AddressBookUser newUser = AddressBookUser.builder()
                            .adbkUserId(adbkUserId)
                            .adbkId(dto.getAdbkId())
                            .emplyrId(userDto.getEmplyrId())
                            .ncrdId(userDto.getNcrdId())
                            .nm(userDto.getNm())
                            .emailAdres(userDto.getEmailAdres())
                            .homeTelno(userDto.getHomeTelno())
                            .moblphonNo(userDto.getMoblphonNo())
                            .offmTelno(userDto.getOffmTelno())
                            .fxnum(userDto.getFxnum())
                            .build();
                    addressBookUserRepository.save(Objects.requireNonNull(newUser));
                } catch (Exception e) {
                    throw new RuntimeException("Failed to generate user ID", e);
                }
            }
        }
    }

    @Override
    @Transactional
    public void deleteAddressBook(String adbkId, String userId) {
        AddressBook entity = addressBookRepository.findById(Objects.requireNonNull(adbkId))
                .orElseThrow(() -> new IllegalArgumentException("AddressBook not found: " + adbkId));

        entity.update(entity.getAdbkNm(), entity.getOthbcScope(), "N", userId);
    }

    @Override
    public Page<AddressBookUserDto> searchUsers(String searchWrd, @NonNull Pageable pageable) {
        return addressBookRepository.searchAddressBookUsers(searchWrd, pageable)
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
        if (id.startsWith("NCRD")) {
            NameCard nameCard = nameCardRepository.findById(id).orElse(null);
            if (nameCard != null) {
                return AddressBookUserDto.builder()
                        .ncrdId(nameCard.getNcrdId())
                        .nm(nameCard.getNcrdNm())
                        .emailAdres(nameCard.getEmailAdres())
                        .homeTelno(nameCard.getTelNo())
                        .moblphonNo(nameCard.getMbtlNum())
                        .build();
            }
        }
        // Simplified for other user types (handled by frontend search usually)
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
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdusrPnttm())
                .build();
    }

    private AddressBookUserDto convertToUserDto(AddressBookUser entity) {
        return AddressBookUserDto.builder()
                .adbkUserId(entity.getAdbkUserId())
                .adbkId(entity.getAdbkId())
                .emplyrId(entity.getEmplyrId())
                .ncrdId(entity.getNcrdId())
                .nm(entity.getNm())
                .emailAdres(entity.getEmailAdres())
                .homeTelno(entity.getHomeTelno())
                .moblphonNo(entity.getMoblphonNo())
                .offmTelno(entity.getOffmTelno())
                .fxnum(entity.getFxnum())
                .build();
    }
}
