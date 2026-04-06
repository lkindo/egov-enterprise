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
                .imageId("IMG1")
                .imageNm("Old Name")
                .build();
        
        // When - update with non-null values to cover all branches
        img.update("New Name", "new.jpg", "file123", "Description", "Y");

        // Then
        assertEquals("New Name", img.getImageNm());
        assertEquals("new.jpg", img.getImage());
        assertEquals("file123", img.getImageFile());
        assertEquals("Description", img.getImageDc());
        assertEquals("Y", img.getReflctAt());

        // When - update with null values for image and file
        img.update("Update2", null, null, "Desc2", "N");
        
        // Then - should retain old values for image and file
        assertEquals("Update2", img.getImageNm());
        assertEquals("new.jpg", img.getImage());
        assertEquals("file123", img.getImageFile());
    }
}
