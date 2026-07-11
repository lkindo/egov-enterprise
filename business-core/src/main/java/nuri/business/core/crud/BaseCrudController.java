package nuri.business.core.crud;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

/**
 * 제네릭 CRUD 컨트롤러 추상 클래스
 * - ApiResponse 봉투 구조를 표준 응답 포맷으로 고정하여 일관성 있는 REST API 노출 강제
 */
public abstract class BaseCrudController<E, ID, Dto, SearchDto> {

    protected abstract BaseCrudService<E, ID, Dto, SearchDto> getService();

    @GetMapping
    public ApiResponse<PageResponse<Dto>> getPage(SearchDto searchDto, Pageable pageable) {
        PageResponse<Dto> page = getService().getPage(searchDto, pageable);
        return ApiResponse.success(page);
    }

    @GetMapping("/{id}")
    public ApiResponse<Dto> getById(@PathVariable ID id) {
        Dto dto = getService().getById(id);
        return ApiResponse.success(dto);
    }

    @PostMapping
    public ApiResponse<Dto> create(@RequestBody Dto dto) {
        Dto created = getService().create(dto);
        return ApiResponse.success(created);
    }

    @PutMapping("/{id}")
    public ApiResponse<Dto> update(@PathVariable ID id, @RequestBody Dto dto) {
        Dto updated = getService().update(id, dto);
        return ApiResponse.success(updated);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable ID id) {
        getService().delete(id);
        return ApiResponse.success(null);
    }
}
