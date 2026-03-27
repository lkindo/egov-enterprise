package com.company.project.business.domain.file;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FileDomainTest {

    @Test
    @DisplayName("FileGroup 및 FileItem 연관관계 테스트")
    void fileGroup_item_relation_test() {
        // Given - Custom constructor test (null ID -> UUID)
        FileGroup group = new FileGroup((String) null);
        assertNotNull(group.getAtchFileId());
        assertEquals("Y", group.getUseAt());

        // Given - FileItem manual constructor test
        FileItem item = new FileItem(group, 1, "/path", "stre.jpg", "orig.jpg", "jpg", 1024L);
        assertEquals(1, item.getFileSn());
        
        // When - add item with double-dispatch check
        group.addFileItem(item);
        
        // Then
        assertEquals(1, group.getFileItems().size());
        assertEquals(group, item.getFileGroup());
    }

    @Test
    @DisplayName("FileDetailId 복합키 테스트")
    void fileDetailId_test() {
        FileDetailId id1 = new FileDetailId("F1", 1);
        FileDetailId id2 = new FileDetailId("F1", 1);
        FileDetailId id3 = new FileDetailId("F2", 2);

        assertEquals(id1, id2);
        assertNotEquals(id1, id3);
        assertEquals(id1.hashCode(), id2.hashCode());
        
        // Coverage for NoArgsConstructor
        FileDetailId empty = new FileDetailId();
        assertNotNull(empty);
    }

    @Test
    @DisplayName("FileMaster 및 FileDetail 엔티티 기본 테스트")
    void fileMaster_detail_test() {
        // FileMaster coverage
        FileMaster master = FileMaster.builder()
                .atchFileId("M1")
                .build();
        assertEquals("M1", master.getAtchFileId());

        // FileDetail coverage
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .fileSn(1)
                .fileMg(100L)
                .build();
        assertEquals(1, detail.getFileSn());
        assertEquals(master, detail.getFileMaster());
        
        // Update method in FileDetail (if exists)
        // detail.update(...) - check file content if needed
    }
}
