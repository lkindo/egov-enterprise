package nuri.business.service.addressbook;

import nuri.business.domain.addressbook.AddressBook;
import nuri.business.domain.addressbook.AddressBookRepository;
import nuri.business.domain.addressbook.AddressBookUser;
import nuri.business.domain.addressbook.AddressBookUserRepository;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
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
    public Page<AddressBookDto> getAddressBookList(String wrterId, String trgetOgnzId, String searchCnd,
            String searchWrd, @NonNull Pageable pageable) {
        return addressBookRepository
                .searchAddressBooks(wrterId, trgetOgnzId, searchCnd, searchWrd, Objects.requireNonNull(pageable))
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
                    .rlsScopeCd(dto.getRlsScopeCd())
                    .trgetOgnzId(dto.getTrgetOgnzId())
                    .useYn("Y")
                    .wrterId(userId)
                    .frstRgtrId(userId)
                    .build();

            addressBookRepository.save(entity);

            if (dto.getAdbkMan() != null) {
                for (AddressBookUserDto userDto : dto.getAdbkMan()) {
                    String adbkUserId = egovAdbkUserIdGnrService.getNextStringId();
                    AddressBookUser userEntity = AddressBookUser.builder()
                            .adbkConstntId(adbkUserId)
                            .adbkId(adbkId)
                            .userId(userDto.getUserId())
                            .nm(userDto.getNm())
                            .emlAddr(userDto.getEmlAddr())
                            .homeTelno(userDto.getHomeTelno())
                            .mblTelno(userDto.getMblTelno())
                            .ofcTelno(userDto.getOfcTelno())
                            .faxNo(userDto.getFaxNo())
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

        entity.update(dto.getAdbkNm(), dto.getRlsScopeCd(), dto.getUseYn());

        if (dto.getAdbkMan() == null) {
            return;
        }

        List<AddressBookUser> existingUsers = addressBookUserRepository.findByAdbkId(dto.getAdbkId());

        for (AddressBookUser existing : existingUsers) {
            boolean remains = dto.getAdbkMan().stream()
                    .anyMatch(u -> (u.getUserId() != null && u.getUserId().equals(existing.getUserId())));
            if (!remains) {
                addressBookUserRepository.delete(existing);
            }
        }

        for (AddressBookUserDto userDto : dto.getAdbkMan()) {
            boolean exists = existingUsers.stream()
                    .anyMatch(u -> (u.getUserId() != null && u.getUserId().equals(userDto.getUserId())));
            if (!exists) {
                try {
                    String adbkUserId = egovAdbkUserIdGnrService.getNextStringId();
                    AddressBookUser newUser = AddressBookUser.builder()
                            .adbkConstntId(adbkUserId)
                            .adbkId(dto.getAdbkId())
                            .userId(userDto.getUserId())
                            .nm(userDto.getNm())
                            .emlAddr(userDto.getEmlAddr())
                            .homeTelno(userDto.getHomeTelno())
                            .mblTelno(userDto.getMblTelno())
                            .ofcTelno(userDto.getOfcTelno())
                            .faxNo(userDto.getFaxNo())
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

        entity.update(entity.getAdbkNm(), entity.getRlsScopeCd(), "N");
    }

    @Override
    public Page<AddressBookUserDto> searchUsers(String searchWrd, @NonNull Pageable pageable) {
        return addressBookRepository.searchAddressBookUsers(searchWrd, Objects.requireNonNull(pageable))
                .map(res -> AddressBookUserDto.builder()
                        .userId(res.getUserId())
                        .nm(res.getUserNm())
                        .emlAddr(res.getEmlAddr())
                        .mblTelno(res.getMblTelno())
                        .ofcTelno(res.getOfficeTelno())
                        .homeTelno(res.getHomeTelno())
                        .build());
    }

    @Override
    public AddressBookUserDto getAdbkUser(String id) {
        return addressBookUserRepository.findById(Objects.requireNonNull(id))
                .map(this::convertToUserDto)
                .orElseThrow(() -> new BusinessException("주소록 사용자를 찾을 수 없습니다: " + id, ErrorCode.RESOURCE_NOT_FOUND));
    }

    private AddressBookDto convertToDto(AddressBook entity) {
        return AddressBookDto.builder()
                .adbkId(entity.getAdbkId())
                .adbkNm(entity.getAdbkNm())
                .rlsScopeCd(entity.getRlsScopeCd())
                .trgetOgnzId(entity.getTrgetOgnzId())
                .useYn(entity.getUseYn())
                .wrterId(entity.getWrterId())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .build();
    }

    private AddressBookUserDto convertToUserDto(AddressBookUser entity) {
        return AddressBookUserDto.builder()
                .adbkConstntId(entity.getAdbkConstntId())
                .adbkId(entity.getAdbkId())
                .userId(entity.getUserId())
                .nm(entity.getNm())
                .emlAddr(entity.getEmlAddr())
                .homeTelno(entity.getHomeTelno())
                .mblTelno(entity.getMblTelno())
                .ofcTelno(entity.getOfcTelno())
                .faxNo(entity.getFaxNo())
                .build();
    }
}
