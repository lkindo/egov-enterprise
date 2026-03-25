package com.company.project.business.service.schedule;

import com.company.project.business.service.schedule.dto.MemoTodoDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovMemoTodoService {
    void registerMemoTodo(MemoTodoDto dto);

    void updateMemoTodo(MemoTodoDto dto);

    void deleteMemoTodo(String todoId);

    MemoTodoDto getMemoTodo(String todoId);

    Page<MemoTodoDto> getMemoTodoList(String writerId, Pageable pageable);
}
