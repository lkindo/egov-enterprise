package nuri.api.controller.business.addressbook;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.business.service.addressbook.AddressBookService;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import nuri.business.service.addressbook.dto.AddressBookUserSelectionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
public class AddressBookApiController {

    private final AddressBookService addressBookService;

    @Operation(summary = "주소록 목록 조회", description = "사용자가 생성한 주소록 또는 공개된 주소록 목록을 조회합니다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.addressbook.AddressBookApiController#getAddressBooks')")
    public ResponseEntity<ApiResponse<PageResponse<AddressBookDto>>> getAddressBooks(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String trgetOgnzId,
            @RequestParam(required = false) String searchCnd,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<AddressBookDto> result = addressBookService.getAddressBookList(userDetails.getUsername(), trgetOgnzId, searchCnd, searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "주소록 상세 조회", description = "주소록의 상세 정보와 포함된 사용자 목록을 조회합니다.")
    @PrivacyAccess("주소록 상세 구성원(성명·이메일·전화번호·팩스)")
    @GetMapping("/{adbkSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.addressbook.AddressBookApiController#getAddressBook')")
    public ResponseEntity<ApiResponse<AddressBookDto>> getAddressBook(
            @Parameter(description = "주소록 일련번호") @PathVariable Long adbkSn) {
        return ResponseEntity.ok(ApiResponse.success(addressBookService.getAddressBook(adbkSn)));
    }

    @Operation(summary = "주소록 등록", description = "새로운 주소록을 생성합니다.")
    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.addressbook.AddressBookApiController#createAddressBook')")
    public ResponseEntity<ApiResponse<Void>> createAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AddressBookDto addressBookDto) {
        addressBookService.createAddressBook(userDetails.getUsername(), addressBookDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "주소록 정보 수정", description = "주소록 명칭, 공개 범위 등 정보를 수정합니다.")
    @PutMapping("/{adbkSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.addressbook.AddressBookApiController#updateAddressBook')")
    public ResponseEntity<ApiResponse<Void>> updateAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "주소록 일련번호") @PathVariable Long adbkSn,
            @Valid @RequestBody AddressBookDto addressBookDto) {
        addressBookDto.setAdbkSn(adbkSn);
        addressBookService.updateAddressBook(userDetails.getUsername(), addressBookDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "주소록 삭제 (사용중지)", description = "주소록을 삭제(사용중지) 상태로 변경 처리합니다.")
    @DeleteMapping("/{adbkSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.addressbook.AddressBookApiController#deleteAddressBook')")
    public ResponseEntity<ApiResponse<Void>> deleteAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "주소록 일련번호") @PathVariable Long adbkSn) {
        addressBookService.deleteAddressBook(adbkSn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Deprecated
    @Operation(summary = "주소록 사용자 검색(구 계약)", deprecated = true,
            description = "외부 소비자 확인 전까지 기존 로그인 ID(userId)·연락처 응답을 유지합니다. 신규 소비자는 연락처 없는 /user-selections의 내부 키(esntlId) 계약으로 전환합니다.")
    @PrivacyAccess("주소록 사용자 검색(로그인 ID·성명·연락처, 퇴역 확인 대기)")
    @GetMapping("/search-users")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.addressbook.AddressBookApiController#searchUsers')")
    public ResponseEntity<ApiResponse<PageResponse<AddressBookUserDto>>> searchUsers(
            @RequestParam String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<AddressBookUserDto> result = addressBookService.searchUsers(searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "주소록 활성 사용자 선택", description = "활성 사용자의 내부 키·이름·부서만 반환합니다. 연락처와 로그인 ID는 반환하지 않습니다.")
    @PrivacyAccess("주소록 활성 사용자 선택(성명·부서)")
    @GetMapping("/user-selections")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.addressbook.AddressBookApiController#searchUserSelections')")
    public ResponseEntity<ApiResponse<PageResponse<AddressBookUserSelectionDto>>> searchUserSelections(
            @RequestParam String searchWrd, @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(addressBookService.searchUserSelections(searchWrd, pageable))));
    }
}
