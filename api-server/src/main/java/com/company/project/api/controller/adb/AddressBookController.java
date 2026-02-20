package com.company.project.api.controller.adb;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.adb.AddressBookService;

import com.company.project.service.adb.dto.AddressBookDto;

import com.company.project.service.adb.dto.AddressBookUserDto;

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

@Tag(name = "AddressBook", description = "Address Book Management APIs")

@RestController

@RequestMapping("/api/v1/address-books")

@RequiredArgsConstructor

public class AddressBookController {

    private final AddressBookService addressBookService;

@Operation(summary = "         ?      ?            ?         ??", description = "         ?      ?            ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<AddressBookDto>>> getAddressBooks(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam(required = false) String trgetOrgnztId,

            @RequestParam(required = false) String searchCnd,

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(

                addressBookService.getAddressBookList(userDetails.getUsername(), trgetOrgnztId, searchCnd, searchWrd, pageable)));

    }

@Operation(summary = "         ?      ??                   ??", description = "?     ??         ?      ?       ?          ?         ?? ?         ??            ??         ???      ??")

    @GetMapping("/{adbkId}")

    public ResponseEntity<ApiResponse<AddressBookDto>> getAddressBook(

            @Parameter(description = "         ?      ?ID") @PathVariable String adbkId) {

        return ResponseEntity.ok(ApiResponse.success(addressBookService.getAddressBook(adbkId)));

    }

@Operation(summary = "         ?      ??         ", description = "??      ??         ?      ?       ?         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createAddressBook(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody AddressBookDto addressBookDto) {

        addressBookService.createAddressBook(userDetails.getUsername(), addressBookDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ?      ???      ", description = "         ??         ?      ??         ????      ??      ??")

    @PutMapping("/{adbkId}")

    public ResponseEntity<ApiResponse<Void>> updateAddressBook(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "         ?      ?ID") @PathVariable String adbkId,

            @RequestBody AddressBookDto addressBookDto) {

        addressBookDto.setAdbkId(adbkId);

        addressBookService.updateAddressBook(userDetails.getUsername(), addressBookDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ?      ?????", description = "?     ??         ?      ?       ??????   ??         )          ???      ??")

    @DeleteMapping("/{adbkId}")

    public ResponseEntity<ApiResponse<Void>> deleteAddressBook(

            @AuthenticationPrincipal UserDetails userDetails,

            @Parameter(description = "         ?      ?ID") @PathVariable String adbkId) {

        addressBookService.deleteAddressBook(adbkId, userDetails.getUsername());

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ?      ??         ??        ??", description = "         ?      ?       ?      ?????????   ?                ??         ??        ??   ???      .")

    @GetMapping("/search-users")

    public ResponseEntity<ApiResponse<Page<AddressBookUserDto>>> searchUsers(

            @RequestParam String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(addressBookService.searchUsers(searchWrd, pageable)));

    }

}

