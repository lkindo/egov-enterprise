package com.company.project.service.schedule;

import com.company.project.domain.schedule.MemoTodo;
import com.company.project.domain.schedule.MemoTodoRepository;
import com.company.project.service.schedule.dto.MemoTodoDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

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
                .todoNm(dto.getTodoNm())
                .todoCn(dto.getTodoCn())
                .todoBeginTime(dto.getTodoBeginTime())
                .todoEndTime(dto.getTodoEndTime())
                .wrterId(dto.getWriterId())
                .frstRegisterId(dto.getWriterId())
                .lastUpdusrId(dto.getWriterId())
                .build();
        memoTodoRepository.save(Objects.requireNonNull(todo));
    }

    @Override
    @Transactional
    public void updateMemoTodo(MemoTodoDto dto) {
        memoTodoRepository.findById(Objects.requireNonNull(dto.getTodoId()))
                .ifPresent(t -> t.update(
                        dto.getTodoNm(),
                        dto.getTodoBeginTime(),
                        dto.getTodoEndTime(),
                        dto.getTodoCn(),
                        dto.getWriterId()));
    }

    @Override
    @Transactional
    public void deleteMemoTodo(String todoId) {
        memoTodoRepository.deleteById(Objects.requireNonNull(todoId));
    }

    @Override
    public MemoTodoDto getMemoTodo(String todoId) {
        return memoTodoRepository.findById(Objects.requireNonNull(todoId))
                .map(t -> MemoTodoDto.builder()
                        .todoId(t.getTodoId())
                        .todoNm(t.getTodoNm())
                        .todoCn(t.getTodoCn())
                        .todoBeginTime(t.getTodoBeginTime())
                        .todoEndTime(t.getTodoEndTime())
                        .writerId(t.getWrterId())
                        .build())
                .orElse(null);
    }

    @Override
    public Page<MemoTodoDto> getMemoTodoList(String writerId, Pageable pageable) {
        // writerId ?꾪꽣�??꾩슂 (Repository ?뺤옣 ??諛섏??
        return memoTodoRepository.findAll(Objects.requireNonNull(pageable))
                .map(t -> MemoTodoDto.builder()
                        .todoId(t.getTodoId())
                        .todoNm(t.getTodoNm())
                        .writerId(t.getWrterId())
                        .todoBeginTime(t.getTodoBeginTime())
                        .build());
    }
}
