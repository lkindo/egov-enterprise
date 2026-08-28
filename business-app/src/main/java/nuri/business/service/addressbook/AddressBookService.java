package nuri.business.service.addressbook;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.addressbook.AddressBook;
import nuri.business.domain.addressbook.AddressBookRepository;
import nuri.business.domain.addressbook.AddressBookUser;
import nuri.business.domain.addressbook.AddressBookUserRepository;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import nuri.foundation.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
public class AddressBookService {

    private final AddressBookRepository addressBookRepository;
    private final AddressBookUserRepository addressBookUserRepository;

    public Page<AddressBookDto> getAddressBookList(String wrterId, String trgetOgnzId, String searchCnd,
            String searchWrd, @NonNull Pageable pageable) {
        return addressBookRepository
                .searchAddressBooks(wrterId, trgetOgnzId, searchCnd, searchWrd, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public AddressBookDto getAddressBook(@NonNull Long adbkSn) {
        AddressBook entity = addressBookRepository.findById(adbkSn)
                .orElseThrow(() -> new BusinessException("주소록을 찾을 수 없습니다: " + adbkSn, CommonErrorCode.RESOURCE_NOT_FOUND));
        // [IDOR] 소유자/관리자만 열람(PII) — 목록(searchAddressBooks)이 wrterId 로만 스코핑되므로 상세도 동일 가드가 필요하다.
        // 공개범위(rlsScopeCd) 예외는 두지 않는다: 코드값이 표준화돼 있지 않고('P'/'G'/'PUBLIC'/'COMPANY' 혼재)
        // 목록 조회도 타인의 '공개' 주소록을 노출하지 않으므로, 상세만 여는 것은 열거 취약점이 된다.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());

        AddressBookDto dto = convertToDto(entity);
        List<AddressBookUser> users = addressBookUserRepository.findByAdbkSn(adbkSn);
        dto.setAdbkMan(users.stream().map(this::convertToUserDto).collect(Collectors.toList()));

        return dto;
    }

    @Transactional
    public void createAddressBook(String userId, AddressBookDto dto) {
        try {
            AddressBook entity = AddressBook.builder()
                    .adbkNm(dto.getAdbkNm())
                    .rlsScopeCd(dto.getRlsScopeCd())
                    .trgetOgnzId(dto.getTrgetOgnzId())
                    .useYn("Y")
                    .wrterId(userId)
                    .build();

            addressBookRepository.save(entity);

            if (dto.getAdbkMan() != null) {
                for (AddressBookUserDto userDto : dto.getAdbkMan()) {
                    AddressBookUser userEntity = AddressBookUser.builder()
                            .addressBook(entity)
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
            throw new BusinessException("주소록 생성 중 오류가 발생했습니다.", CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    public void updateAddressBook(String userId, AddressBookDto dto) {
        AddressBook entity = addressBookRepository.findById(Objects.requireNonNull(dto.getAdbkSn()))
                .orElseThrow(() -> new BusinessException("수정할 주소록이 존재하지 않습니다.", CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 수정(PII)

        entity.update(dto.getAdbkNm(), dto.getRlsScopeCd(), dto.getUseYn());

        if (dto.getAdbkMan() == null) {
            return;
        }

        List<AddressBookUser> existingUsers = addressBookUserRepository.findByAdbkSn(dto.getAdbkSn());

        for (AddressBookUser existing : existingUsers) {
            boolean remains = dto.getAdbkMan().stream()
                    .anyMatch(u -> (u.getUserId() != null && u.getUserId().equals(existing.getUserId())));
            if (!remains) {
                addressBookUserRepository.delete(existing);
            }
        }

        for (AddressBookUserDto userDto : dto.getAdbkMan()) {
            /*
             * [2026-08-28] 기존 구성원의 연락 정보를 실제로 갱신한다.
             * 종전에는 같은 userId 를 만나면 아무것도 하지 않고 넘어갔다 — 화면이 이메일·연락처를
             * 바꿔 보내도 200 만 돌아오고 값은 그대로였다. 조용히 성공하는 no-op 이었다.
             */
            AddressBookUser existing = existingUsers.stream()
                    .filter(u -> u.getUserId() != null && u.getUserId().equals(userDto.getUserId()))
                    .findFirst()
                    .orElse(null);
            if (existing != null) {
                existing.updateContact(userDto.getNm(), userDto.getEmlAddr(), userDto.getHomeTelno(),
                        userDto.getMblTelno(), userDto.getOfcTelno(), userDto.getFaxNo());
                continue;
            }
            try {
                    AddressBookUser newUser = AddressBookUser.builder()
                            .addressBook(entity)
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
                    throw new BusinessException("ID 생성 중 오류가 발생했습니다.", CommonErrorCode.INTERNAL_SERVER_ERROR);
                }
        }
    }

    @Transactional
    public void deleteAddressBook(Long adbkSn, String userId) {
        AddressBook entity = addressBookRepository.findById(adbkSn)
                .orElseThrow(() -> new BusinessException("삭제할 주소록이 존재하지 않습니다.", CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 삭제(PII)

        entity.update(entity.getAdbkNm(), entity.getRlsScopeCd(), "N");
    }

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

    public AddressBookUserDto getAdbkUser(Long id) {
        return addressBookUserRepository.findById(Objects.requireNonNull(id))
                .map(this::convertToUserDto)
                .orElseThrow(() -> new BusinessException("주소록 사용자를 찾을 수 없습니다: " + id, CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    private AddressBookDto convertToDto(AddressBook entity) {
        return AddressBookDto.builder()
                .adbkSn(entity.getAdbkSn())
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
                .adbkMbrSn(entity.getAdbkMbrSn())
                .adbkSn(entity.getAddressBook() != null ? entity.getAddressBook().getAdbkSn() : null)
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
