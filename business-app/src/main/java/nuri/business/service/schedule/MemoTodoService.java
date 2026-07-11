package nuri.business.service.schedule;

import nuri.business.domain.schedule.MemoTodo;
import nuri.business.domain.schedule.MemoTodoRepository;
import nuri.business.service.schedule.dto.MemoTodoDto;
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
                .todoTtl(dto.getTodoTtl())
                .todoCn(dto.getTodoCn())
                .todoBgngTm(dto.getTodoBgngTm())
                .todoEndTm(dto.getTodoEndTm())
                .userId(dto.getUserId())
                .build();
        memoTodoRepository.save(Objects.requireNonNull(todo));
    }

    @Override
    @Transactional
    public void updateMemoTodo(MemoTodoDto dto) {
        memoTodoRepository.findById(Objects.requireNonNull(dto.getTodoId()))
                .ifPresent(t -> t.update(
                        dto.getTodoTtl(),
                        dto.getTodoBgngTm(),
                        dto.getTodoEndTm(),
                        dto.getTodoCn()));
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
                        .todoTtl(t.getTodoTtl())
                        .todoCn(t.getTodoCn())
                        .todoBgngTm(t.getTodoBgngTm())
                        .todoEndTm(t.getTodoEndTm())
                        .userId(t.getUserId())
                        .build())
                .orElse(null);
    }

    @Override
    public Page<MemoTodoDto> getMemoTodoList(String userId, Pageable pageable) {
        return memoTodoRepository.findByUserId(Objects.requireNonNull(userId), Objects.requireNonNull(pageable))
                .map(t -> MemoTodoDto.builder()
                        .todoId(t.getTodoId())
                        .todoTtl(t.getTodoTtl())
                        .userId(t.getUserId())
                        .todoBgngTm(t.getTodoBgngTm())
                        .build());
    }
}
