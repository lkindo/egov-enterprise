package nuri.business.core.crud;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 제네릭 CRUD 서비스 추상 클래스
 * - 반복적인 비즈니스 로직(목록조회, 페이징, 상세조회, 생성, 수정, 삭제)을 추상화하여 보일러플레이트 코드를 줄임
 */
@Transactional(readOnly = true)
public abstract class BaseCrudService<E, ID, Dto, SearchDto> {

    protected abstract JpaRepository<E, ID> getRepository();
    protected abstract Dto toDto(E entity);
    protected abstract E toEntity(Dto dto);
    protected abstract void updateEntity(E entity, Dto dto);

    public PageResponse<Dto> getPage(SearchDto searchDto, Pageable pageable) {
        Page<E> page = getRepository().findAll(pageable);
        List<Dto> content = page.getContent().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return PageResponse.of(page.map(this::toDto));
    }

    public Dto getById(ID id) {
        E entity = getRepository().findById(id)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return toDto(entity);
    }

    @Transactional
    public Dto create(Dto dto) {
        E entity = toEntity(dto);
        E saved = getRepository().save(entity);
        return toDto(saved);
    }

    @Transactional
    public Dto update(ID id, Dto dto) {
        E entity = getRepository().findById(id)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        updateEntity(entity, dto);
        E saved = getRepository().save(entity);
        return toDto(saved);
    }

    @Transactional
    public void delete(ID id) {
        if (!getRepository().existsById(id)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        getRepository().deleteById(id);
    }
}
