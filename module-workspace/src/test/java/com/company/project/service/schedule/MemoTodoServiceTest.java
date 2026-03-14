package com.company.project.service.schedule;

import com.company.project.domain.schedule.MemoTodo;
import com.company.project.domain.schedule.MemoTodoRepository;
import com.company.project.service.schedule.dto.MemoTodoDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("MemoTodoService 테스트")
class MemoTodoServiceTest {

    @Mock
    private MemoTodoRepository memoTodoRepository;

    @InjectMocks
    private MemoTodoService memoTodoService;

    @Test
    @DisplayName("메모 할일 목록 조회")
    void getMemoTodoList_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        MemoTodo entity = MemoTodo.builder().todoId("T1").todoNm("Task1").build();
        given(memoTodoRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<MemoTodoDto> result = memoTodoService.getMemoTodoList("user1", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("메모 할일 상세 조회")
    void getMemoTodo_Success() {
        // Given
        MemoTodo entity = MemoTodo.builder().todoId("T1").build();
        given(memoTodoRepository.findById("T1")).willReturn(Optional.of(entity));

        // When
        MemoTodoDto result = memoTodoService.getMemoTodo("T1");

        // Then
        assertThat(result.getTodoId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("메모 할일 등록")
    void registerMemoTodo_Success() {
        // Given
        MemoTodoDto dto = MemoTodoDto.builder().todoId("T1").todoNm("New").build();

        // When
        memoTodoService.registerMemoTodo(dto);

        // Then
        verify(memoTodoRepository).save(any(MemoTodo.class));
    }

    @Test
    @DisplayName("메모 할일 수정")
    void updateMemoTodo_Success() {
        // Given
        MemoTodo entity = MemoTodo.builder().todoId("T1").build();
        given(memoTodoRepository.findById("T1")).willReturn(Optional.of(entity));
        MemoTodoDto dto = MemoTodoDto.builder().todoId("T1").todoNm("Updated").build();

        // When
        memoTodoService.updateMemoTodo(dto);

        // Then
        verify(memoTodoRepository).findById("T1");
    }

    @Test
    @DisplayName("메모 할일 삭제")
    void deleteMemoTodo_Success() {
        // When
        memoTodoService.deleteMemoTodo("T1");

        // Then
        verify(memoTodoRepository).deleteById("T1");
    }
}
