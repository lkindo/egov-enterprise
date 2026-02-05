package egovframework.com.uss.umt.service.impl;

import com.company.project.domain.user.EnterpriseUserRepository;
import com.company.project.domain.user.GeneralUserRepository;
import com.company.project.domain.user.TermsRepository;
import com.company.project.domain.user.UserRepository;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EgovMberManageServiceTest {

    @Mock
    private GeneralUserRepository generalUserRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EnterpriseUserRepository enterpriseUserRepository;

    @Mock
    private TermsRepository termsRepository;

    @Mock
    private EgovIdGnrService idgenService;

    @InjectMocks
    private EgovMberManageServiceImpl mberManageService;

    @Test
    void deleteMber_shouldDeleteBatch() {
        // Arrange
        // Create 100 users for each type
        String userIds = IntStream.range(0, 100)
                .mapToObj(i -> "USR03:USER_" + i)
                .collect(Collectors.joining(","));

        String generalUserIds = IntStream.range(0, 100)
                .mapToObj(i -> "USR01:GEN_" + i)
                .collect(Collectors.joining(","));

        String enterpriseUserIds = IntStream.range(0, 100)
                .mapToObj(i -> "USR02:ENT_" + i)
                .collect(Collectors.joining(","));

        String allIds = userIds + "," + generalUserIds + "," + enterpriseUserIds;

        // Act
        mberManageService.deleteMber(allIds);

        // Assert (Optimized: deleteAllById called 1 time for each, deleteById called 0 times)
        verify(userRepository, times(1)).deleteAllById(any());
        verify(generalUserRepository, times(1)).deleteAllById(any());
        verify(enterpriseUserRepository, times(1)).deleteAllById(any());

        verify(userRepository, never()).deleteById(anyString());
        verify(generalUserRepository, never()).deleteById(anyString());
        verify(enterpriseUserRepository, never()).deleteById(anyString());
    }
}
