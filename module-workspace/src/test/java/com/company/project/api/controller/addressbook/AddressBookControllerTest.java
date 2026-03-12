package com.company.project.api.controller.addressbook;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.addressbook.AddressBookService;
import com.company.project.service.addressbook.dto.AddressBookDto;
import com.company.project.service.addressbook.dto.AddressBookUserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AddressBookController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AddressBookController 테스트")
class AddressBookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AddressBookService addressBookService;

    @Test
    @WithMockUser(username = "testUser")
    @DisplayName("주소록 목록 조회 성공")
    void getAddressBooks_Success() throws Exception {
        // Given
        Page<AddressBookDto> page = new PageImpl<>(List.of(new AddressBookDto()));
        given(addressBookService.getAddressBookList(anyString(), anyString(), anyString(), anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/address-books")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("주소록 상세 조회 성공")
    void getAddressBook_Success() throws Exception {
        // Given
        given(addressBookService.getAddressBook(anyString())).willReturn(new AddressBookDto());

        // When & Then
        mockMvc.perform(get("/api/v1/address-books/ADBK_1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "testUser")
    @DisplayName("주소록 등록 성공")
    void createAddressBook_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"adbkNm\":\"My Address Book\", \"othbcAt\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("사용자 검색 성공")
    void searchUsers_Success() throws Exception {
        // Given
        Page<AddressBookUserDto> page = new PageImpl<>(List.of(new AddressBookUserDto()));
        given(addressBookService.searchUsers(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/address-books/search-users")
                .param("searchWrd", "test")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
