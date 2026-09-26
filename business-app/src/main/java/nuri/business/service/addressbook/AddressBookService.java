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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;
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

    private static final int USER_SEARCH_MIN_KEYWORD_LENGTH = 2;
    private static final int USER_SEARCH_MAX_PAGE_SIZE = 20;

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
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "ADBK_READ_ALL");

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
                    // 연결된 사용자는 요청에서 받지 않는다 — 손으로 적는 연락처다(DIP B5 F8).
                    AddressBookUser userEntity = AddressBookUser.builder()
                            .addressBook(entity)
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
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "ADBK_UPDATE_ALL"); // [IDOR] 소유자/관리자만 수정(PII)

        // [2026-08-29] useYn 은 생략되면 **기존 값을 보존**한다.
        //   종전에는 dto.getUseYn() 을 그대로 넘겨 null 로 덮었다. 그런데 목록 질의는
        //   AddressBookRepositoryImpl:37,49 에서 useYn.eq("Y") 로만 거른다 — 즉 이름만 바꾼
        //   주소록이 조용히 목록에서 사라졌다. 화면은 그동안 '주소록이 수정되었습니다.' 라고
        //   알리고 목록으로 되돌아갔으므로, 사용자는 자기가 방금 무엇을 지웠는지 알 수 없었다.
        //   이 엔드포인트를 부르는 프런트 경로는 useYn 을 보내지 않으므로 모든 수정이 그랬다.
        //   adbkNm·rlsScopeCd 는 @NotBlank 라 null 이 도달할 수 없어 이 보존이 필요 없다 —
        //   useYn 한 축만 다루고 나머지는 종전 대입 의미를 유지한다.
        String useYn = dto.getUseYn() != null ? dto.getUseYn() : entity.getUseYn();
        entity.update(dto.getAdbkNm(), dto.getRlsScopeCd(), useYn);

        if (dto.getAdbkMan() == null) {
            return;
        }

        /*
         * [2026-09-26 DIP B5 F8] 구성원은 adbkMbrSn 으로 가리킨다. 종전에는 userId 로 대조했는데 화면이 작성자 자신의 ID 를
         * 모든 구성원에 넣어, 구성원이 둘 이상이면 모두 같은 키가 되어 첫 구성원만 갱신되고 나머지는 지워지거나 중복됐다.
         * 요청의 adbkMbrSn 이 이 주소록의 구성원이 아니거나 두 번 나오면 무엇을 고칠지 정할 수 없어 400 이다 —
         * 남의 주소록 구성원을 번호로 끌어와 고치는 경로도 이것으로 막힌다.
         */
        List<AddressBookUser> existingUsers = addressBookUserRepository.findByAdbkSn(dto.getAdbkSn());
        java.util.Map<Long, AddressBookUser> existingById = new java.util.HashMap<>();
        for (AddressBookUser existing : existingUsers) {
            existingById.put(existing.getAdbkMbrSn(), existing);
        }
        java.util.Set<Long> kept = new java.util.HashSet<>();
        for (AddressBookUserDto userDto : dto.getAdbkMan()) {
            Long adbkMbrSn = userDto.getAdbkMbrSn();
            if (adbkMbrSn == null) {
                continue;
            }
            if (!existingById.containsKey(adbkMbrSn)) {
                throw new BusinessException("이 주소록의 구성원이 아닙니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
            if (!kept.add(adbkMbrSn)) {
                throw new BusinessException("같은 구성원이 두 번 들어 있습니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
        }

        for (AddressBookUser existing : existingUsers) {
            if (!kept.contains(existing.getAdbkMbrSn())) {
                addressBookUserRepository.delete(existing);
            }
        }

        for (AddressBookUserDto userDto : dto.getAdbkMan()) {
            if (userDto.getAdbkMbrSn() != null) {
                existingById.get(userDto.getAdbkMbrSn()).updateContact(userDto.getNm(), userDto.getEmlAddr(),
                        userDto.getHomeTelno(), userDto.getMblTelno(), userDto.getOfcTelno(), userDto.getFaxNo());
                continue;
            }
            try {
                    AddressBookUser newUser = AddressBookUser.builder()
                            .addressBook(entity)
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
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "ADBK_DELETE_ALL"); // [IDOR] 소유자/관리자만 삭제(PII)

        entity.update(entity.getAdbkNm(), entity.getRlsScopeCd(), "N");
    }

    public Page<AddressBookUserDto> searchUsers(String searchWrd, @NonNull Pageable pageable) {
        Pageable requestedPageable = Objects.requireNonNull(pageable);
        Pageable cappedPageable = PageRequest.of(
                requestedPageable.getPageNumber(),
                Math.min(requestedPageable.getPageSize(), USER_SEARCH_MAX_PAGE_SIZE),
                requestedPageable.getSort());
        String normalizedSearchWrd = searchWrd == null ? "" : searchWrd.trim();
        if (normalizedSearchWrd.length() < USER_SEARCH_MIN_KEYWORD_LENGTH) {
            return Page.empty(cappedPageable);
        }

        return addressBookRepository.searchAddressBookUsers(normalizedSearchWrd, cappedPageable)
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
