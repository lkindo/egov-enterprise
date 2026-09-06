package nuri.api.controller.business.addressbook;

import nuri.business.service.addressbook.AddressBookService;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import nuri.business.support.ControllerTestSupport;
import nuri.foundation.core.annotation.PrivacyAccess;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AddressBookApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AddressBookApiController 테스트")
class AddressBookApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private AddressBookService addressBookService;

    @Test
    @DisplayName("개인정보를 반환하는 상세·사용자 검색에 접근 증적을 선언")
    void sensitiveReadsDeclarePrivacyAccess() throws NoSuchMethodException {
        PrivacyAccess detail = AddressBookApiController.class
                .getDeclaredMethod("getAddressBook", Long.class)
                .getAnnotation(PrivacyAccess.class);
        PrivacyAccess userSearch = AddressBookApiController.class
                .getDeclaredMethod("searchUsers", String.class, Pageable.class)
                .getAnnotation(PrivacyAccess.class);

        assertThat(detail).isNotNull();
        assertThat(detail.value()).isNotBlank();
        assertThat(userSearch).isNotNull();
        assertThat(userSearch.value()).isNotBlank();
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 목록 조회 성공")
    void getAddressBooks_Success() throws Exception {
        // Given
        Page<AddressBookDto> page = new PageImpl<>(List.of(new AddressBookDto()));
        given(addressBookService.getAddressBookList(any(), any(), any(), any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/address-books")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray());
    }

    @Test
    @DisplayName("주소록 상세 조회 성공")
    void getAddressBook_Success() throws Exception {
        // Given
        given(addressBookService.getAddressBook(anyLong())).willReturn(new AddressBookDto());

        // When & Then
        mockMvc.perform(get("/api/v1/address-books/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 등록 성공")
    void createAddressBook_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"adbkNm\":\"My Address Book\", \"rlsScopeCd\":\"PUBLIC\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 등록은 중첩 구성원의 필수 사용자 ID를 검증한다")
    void createAddressBook_RejectsInvalidNestedMember() throws Exception {
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "adbkNm": "My Address Book",
                          "rlsScopeCd": "PUBLIC",
                          "adbkMan": [{"userId": ""}]
                        }
                        """)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(addressBookService);
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 등록은 null 구성원을 검증 단계에서 거절한다")
    void createAddressBook_RejectsNullNestedMember() throws Exception {
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "adbkNm": "My Address Book",
                          "rlsScopeCd": "PUBLIC",
                          "adbkMan": [null]
                        }
                        """)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(addressBookService);
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
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list").isArray());
    }
}
