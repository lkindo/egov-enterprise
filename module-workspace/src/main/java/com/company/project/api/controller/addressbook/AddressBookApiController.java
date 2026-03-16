package com.company.project.api.controller.addressbook;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.addressbook.AddressBookService;
import com.company.project.service.addressbook.dto.AddressBookDto;
import com.company.project.service.addressbook.dto.AddressBookUserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "AddressBook", description = "주소록 관리 API")
@RestController
@RequestMapping("/api/v1/address-books")
@RequiredArgsConstructor
public class AddressBookController {

    private final AddressBookService addressBookService;

    @Operation(summary = "주소록 목록 조회", description = "사용자가 생성한 주소록 또는 공개된 주소록 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AddressBookDto>>> getAddressBooks(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String trgetOrgnztId,
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                addressBookService.getAddressBookList(userDetails.getUsername(), trgetOrgnztId, searchCnd, searchWrd,
                        pageable)));
    }

    @Operation(summary = "주소록 상세 조회", description = "주소록의 상세 정보와 포함된 사용자 목록을 조회합니다.")
    @GetMapping("/{adbkId}")
    public ResponseEntity<ApiResponse<AddressBookDto>> getAddressBook(
            @Parameter(description = "주소록 ID") @PathVariable String adbkId) {
        return ResponseEntity.ok(ApiResponse.success(addressBookService.getAddressBook(adbkId)));
    }

    @Operation(summary = "주소록 등록", description = "새로운 주소록을 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AddressBookDto addressBookDto) {
        addressBookService.createAddressBook(userDetails.getUsername(), addressBookDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "주소록 정보 수정", description = "주소록 명칭, 공개 범위 등 정보를 수정합니다.")
    @PutMapping("/{adbkId}")
    public ResponseEntity<ApiResponse<Void>> updateAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "주소록 ID") @PathVariable String adbkId,
            @RequestBody AddressBookDto addressBookDto) {
        addressBookDto.setAdbkId(adbkId);
        addressBookService.updateAddressBook(userDetails.getUsername(), addressBookDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "주소록 삭제 (사용중지)", description = "주소록을 삭제(사용중지) 상태로 변경 처리합니다.")
    @DeleteMapping("/{adbkId}")
    public ResponseEntity<ApiResponse<Void>> deleteAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "주소록 ID") @PathVariable String adbkId) {
        addressBookService.deleteAddressBook(adbkId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "주소록 사용자 검색", description = "주소록에 추가할 사용자를 시스템 전체에서 검색합니다.")
    @GetMapping("/search-users")
    public ResponseEntity<ApiResponse<Page<AddressBookUserDto>>> searchUsers(
            @RequestParam String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(addressBookService.searchUsers(searchWrd, pageable)));
    }
}
