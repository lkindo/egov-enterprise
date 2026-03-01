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

@Tag(name = "AddressBook", description = "ì£¼ì†Œë¡?ê´€ë¦?API")
@RestController
@RequestMapping("/api/v1/address-books")
@RequiredArgsConstructor
public class AddressBookController {

    private final AddressBookService addressBookService;

    @Operation(summary = "ì£¼ì†Œë¡?ëª©ë¡ ì¡°íšŒ", description = "?¬ìš©?ê? ?ì„±??ì£¼ì†Œë¡??ëŠ” ê³µê°œ??ì£¼ì†Œë¡?ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
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

    @Operation(summary = "ì£¼ì†Œë¡??ì„¸ ì¡°íšŒ", description = "ì£¼ì†Œë¡ì˜ ?ì„¸ ?•ë³´?€ ?¬í•¨???¬ìš©??ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{adbkId}")
    public ResponseEntity<ApiResponse<AddressBookDto>> getAddressBook(
            @Parameter(description = "ì£¼ì†Œë¡?ID") @PathVariable String adbkId) {
        return ResponseEntity.ok(ApiResponse.success(addressBookService.getAddressBook(adbkId)));
    }

    @Operation(summary = "ì£¼ì†Œë¡??±ë¡", description = "?ˆë¡œ??ì£¼ì†Œë¡ì„ ?ì„±?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AddressBookDto addressBookDto) {
        addressBookService.createAddressBook(userDetails.getUsername(), addressBookDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì£¼ì†Œë¡??•ë³´ ?˜ì •", description = "ì£¼ì†Œë¡?ëª…ì¹­, ê³µê°œ ?¬ë? ???•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{adbkId}")
    public ResponseEntity<ApiResponse<Void>> updateAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "ì£¼ì†Œë¡?ID") @PathVariable String adbkId,
            @RequestBody AddressBookDto addressBookDto) {
        addressBookDto.setAdbkId(adbkId);
        addressBookService.updateAddressBook(userDetails.getUsername(), addressBookDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì£¼ì†Œë¡??? œ (?¬ìš©ì¤‘ì?)", description = "ì£¼ì†Œë¡ì„ ?? œ(?¬ìš©ì¤‘ì? ?íƒœë¡?ë³€ê²? ì²˜ë¦¬?©ë‹ˆ??")
    @DeleteMapping("/{adbkId}")
    public ResponseEntity<ApiResponse<Void>> deleteAddressBook(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "ì£¼ì†Œë¡?ID") @PathVariable String adbkId) {
        addressBookService.deleteAddressBook(adbkId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ì£¼ì†Œë¡??¬ìš©??ê²€??, description = "ì£¼ì†Œë¡ì— ì¶”ê????¬ìš©?ë? ?œìŠ¤???„ì²´?ì„œ ê²€?‰í•©?ˆë‹¤.")
    @GetMapping("/search-users")
    public ResponseEntity<ApiResponse<Page<AddressBookUserDto>>> searchUsers(
            @RequestParam String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(addressBookService.searchUsers(searchWrd, pageable)));
    }
}
