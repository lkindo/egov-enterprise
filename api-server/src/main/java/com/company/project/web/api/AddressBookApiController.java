package com.company.project.web.api;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.company.project.service.addressbook.EgovAddressBookService;
import com.company.project.service.addressbook.dto.AddressBookDto;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 주소록 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/addressbook")
@RequiredArgsConstructor
public class AddressBookApiController {

    private final EgovAddressBookService egovAddressBookService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAddressBookList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<AddressBookDto> pageResult = egovAddressBookService.getAddressBookList(searchWrd, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("resultList", pageResult.getContent());
        response.put("totalCount", pageResult.getTotalElements());
        response.put("pageIndex", pageIndex);
        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> getMyAddressBooks(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {
        String userId = getCurrentUserId();
        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<AddressBookDto> pageResult = egovAddressBookService.getMyAddressBooks(userId, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("resultList", pageResult.getContent());
        response.put("totalCount", pageResult.getTotalElements());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{adbkId}")
    public ResponseEntity<Map<String, Object>> getAddressBook(@PathVariable String adbkId) {
        AddressBookDto dto = egovAddressBookService.getAddressBook(adbkId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("addressBook", dto));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAddressBook(@RequestBody AddressBookDto dto) {
        String userId = getCurrentUserId();
        if (userId.equals("anonymous")) {
            return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다."));
        }

        try {
            String newId = egovAddressBookService.createAddressBook(userId, dto);
            return ResponseEntity.ok(Map.of("success", true, "adbkId", newId, "message", "주소록이 등록되었습니다."));
        } catch (Exception e) {
            log.error("Failed to create addressbook: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{adbkId}")
    public ResponseEntity<Map<String, Object>> updateAddressBook(@PathVariable String adbkId,
            @RequestBody AddressBookDto dto) {
        String userId = getCurrentUserId();
        try {
            egovAddressBookService.updateAddressBook(adbkId, userId, dto);
            return ResponseEntity.ok(Map.of("success", true, "message", "주소록이 수정되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{adbkId}")
    public ResponseEntity<Map<String, Object>> deleteAddressBook(@PathVariable String adbkId) {
        try {
            egovAddressBookService.deleteAddressBook(adbkId);
            return ResponseEntity.ok(Map.of("success", true, "message", "주소록이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private String getCurrentUserId() {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        return (user != null) ? user.getUniqId() : "anonymous";
    }
}
