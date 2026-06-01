package nuri.business.domain.image;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MainImageDomainTest {

    @Test
    @DisplayName("MainImage 엔티티 생성 및 업데이트 테스트")
    void mainImage_test() {
        // Given
        MainImage img = MainImage.builder()
                .imgId("IMG1")
                .imgNm("Old Name")
                .build();
        
        // When - update with non-null values to cover all branches
        img.update("New Name", "new.jpg", "file123", "Description", "Y");

        // Then
        assertEquals("New Name", img.getImgNm());
        assertEquals("new.jpg", img.getMainImgFilePath());
        assertEquals("file123", img.getImgFileNm());
        assertEquals("Description", img.getMainImgExpln());
        assertEquals("Y", img.getRfltYn());

        // When - update with null values for image and file
        img.update("Update2", null, null, "Desc2", "N");
        
        // Then - should retain old values for image and file
        assertEquals("Update2", img.getImgNm());
        assertEquals("new.jpg", img.getMainImgFilePath());
        assertEquals("file123", img.getImgFileNm());
    }
}
