package com.company.project.service.schedule;

import com.company.project.domain.schedule.MemoTodo;
import com.company.project.domain.schedule.MemoTodoRepository;
import com.company.project.service.schedule.dto.MemoTodoDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemoTodoService implements EgovMemoTodoService {

    private final MemoTodoRepository memoTodoRepository;

    @Override
    @Transactional
    public void registerMemoTodo(MemoTodoDto dto) {
        MemoTodo todo = MemoTodo.builder()
                .todoId(dto.getTodoId())
                .todoSubject(dto.getTodoSubject())
                .todoCn(dto.getTodoCn())
                .beginTime(dto.getBeginTime())
                .endTime(dto.getEndTime())
                .writerId(dto.getWriterId())
                .frstRegisterId(dto.getWriterId())
                .lastUpdusrId(dto.getWriterId())
                .build();
        memoTodoRepository.save(todo);
    }

    @Override
    @Transactional
    public void updateMemoTodo(MemoTodoDto dto) {
        memoTodoRepository.findById(dto.getTodoId())
                .ifPresent(t -> t.update(
                        dto.getTodoSubject(),
                        dto.getTodoCn(),
                        dto.getBeginTime(),
                        dto.getEndTime(),
                        dto.getWriterId()));
    }

    @Override
    @Transactional
    public void deleteMemoTodo(String todoId) {
        memoTodoRepository.deleteById(todoId);
    }

    @Override
    public MemoTodoDto getMemoTodo(String todoId) {
        return memoTodoRepository.findById(todoId)
                .map(t -> MemoTodoDto.builder()
                        .todoId(t.getTodoId())
                        .todoSubject(t.getTodoSubject())
                        .todoCn(t.getTodoCn())
                        .beginTime(t.getBeginTime())
                        .endTime(t.getEndTime())
                        .writerId(t.getWriterId())
                        .build())
                .orElse(null);
    }

    @Override
    public Page<MemoTodoDto> getMemoTodoList(String writerId, Pageable pageable) {
        // writerId 필터링 필요 (Repository 확장 시 반영)
        return memoTodoRepository.findAll(pageable)
                .map(t -> MemoTodoDto.builder()
                        .todoId(t.getTodoId())
                        .todoSubject(t.getTodoSubject())
                        .writerId(t.getWriterId())
                        .beginTime(t.getBeginTime())
                        .build());
    }
}
