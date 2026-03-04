package com.company.project.domain.batch;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Objects;
import java.util.List;

/**
 * 獄쏄퀣??臾믩씜 Repository Custom ?닌뗭겱筌?
 */
@RequiredArgsConstructor
public class BatchOpertRepositoryImpl implements BatchOpertRepositoryCustom {

    @Override
    public Page<BatchOpert> searchBatchOperts(String searchCondition, String searchKeyword, Pageable pageable) {
        return new PageImpl<>(Objects.requireNonNull(List.of()), Objects.requireNonNull(pageable), 0);
    }
}