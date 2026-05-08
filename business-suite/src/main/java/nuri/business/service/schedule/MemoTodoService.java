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
                .todoNm(dto.getTodoNm())
                .todoCn(dto.getTodoCn())
                .todoBeginTime(dto.getTodoBeginTime())
                .todoEndTime(dto.getTodoEndTime())
                .wrterId(dto.getWriterId())
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
        // [TODO] writerId 필터링 필요 (Repository 확장 반영 예정)
        return memoTodoRepository.findAll(Objects.requireNonNull(pageable))
                .map(t -> MemoTodoDto.builder()
                        .todoId(t.getTodoId())
                        .todoNm(t.getTodoNm())
                        .writerId(t.getWrterId())
                        .todoBeginTime(t.getTodoBeginTime())
                        .build());
    }
}
