package com.company.project.service.addressbook;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.addressbook.AddressBook;
import com.company.project.domain.addressbook.AddressBookRepository;
import com.company.project.service.addressbook.dto.AddressBookDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 주소록 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AddressBookService implements EgovAddressBookService {

    private final AddressBookRepository addressBookRepository;

    @Override
    public Page<AddressBookDto> getAddressBookList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return addressBookRepository.findAll(pageable).map(AddressBookDto::from);
        }
        return addressBookRepository.findByAdbkNmContaining(keyword, pageable).map(AddressBookDto::from);
    }

    @Override
    public Page<AddressBookDto> getMyAddressBooks(String userId, Pageable pageable) {
        return addressBookRepository.findByWrterId(userId, pageable).map(AddressBookDto::from);
    }

    @Override
    public AddressBookDto getAddressBook(String adbkId) {
        AddressBook addressBook = addressBookRepository.findById(adbkId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return AddressBookDto.from(addressBook);
    }

    @Override
    @Transactional
    public String createAddressBook(String userId, AddressBookDto dto) {
        String adbkId = "ADBK_" + String.format("%013d", System.currentTimeMillis());

        AddressBook addressBook = AddressBook.builder()
                .adbkId(adbkId)
                .adbkNm(dto.getAdbkNm())
                .othbcScope(dto.getOthbcScope())
                .trgetOrgnztId(dto.getTrgetOrgnztId())
                .useAt(dto.getUseAt())
                .wrterId(userId)
                .frstRegisterId(userId)
                .build();

        addressBookRepository.save(addressBook);
        return adbkId;
    }

    @Override
    @Transactional
    public void updateAddressBook(String adbkId, String userId, AddressBookDto dto) {
        AddressBook addressBook = addressBookRepository.findById(adbkId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        addressBook.update(dto.getAdbkNm(), dto.getOthbcScope(), dto.getUseAt(), userId);
    }

    @Override
    @Transactional
    public void deleteAddressBook(String adbkId) {
        AddressBook addressBook = addressBookRepository.findById(adbkId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        addressBookRepository.delete(addressBook);
    }

    @Override
    public List<AddressBookDto> getActiveAddressBooks() {
        return addressBookRepository.findByUseAt("Y").stream()
                .map(AddressBookDto::from)
                .collect(Collectors.toList());
    }
}
