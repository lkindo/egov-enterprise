package nuri.business.service.file;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 게시판 영상의 컨테이너 헤더 판정(MP4 첫 ftyp box, WebM EBML Header). 업로드가 확장자만 믿지 않게 하는 경계다.
 *
 * <p>[2026-11-25 품질 평가 3순위 14] 업로드 시험은 정상 헤더와 명백한 위조만 보아, 상자 크기·가변 길이 정수의 경계와 크기 넘침을
 * 바꾸는 변이가 살아남았다(business-core-file 범위). 경계마다 바로 안쪽과 바깥쪽을 함께 본다.
 */
class BoardMediaSignatureTest {

    @Test
    @DisplayName("지원 확장자는 mp4·webm 뿐이다")
    void supportsOnlyMp4AndWebm() {
        assertThat(BoardMediaSignature.supportsExtension("mp4")).isTrue();
        assertThat(BoardMediaSignature.supportsExtension("webm")).isTrue();
        assertThat(BoardMediaSignature.supportsExtension("avi")).isFalse();
        assertThat(BoardMediaSignature.supportsExtension("MP4")).isFalse();
    }

    @Test
    @DisplayName("MP4: 16바이트짜리 ftyp 상자도 받는다 — 15바이트 헤더·16 미만 상자는 받지 않는다")
    void mp4BoxSizeLowerBoundary() {
        assertThat(BoardMediaSignature.isMp4(ftyp(16, "isom", 16))).isTrue();
        assertThat(BoardMediaSignature.isMp4(java.util.Arrays.copyOf(ftyp(16, "isom", 16), 15))).isFalse();
        assertThat(BoardMediaSignature.isMp4(ftyp(12, "isom", 16))).isFalse();
    }

    @Test
    @DisplayName("MP4: 상자 크기가 읽은 헤더 길이와 같으면 받고 넘으면 받지 않는다 — 크기는 빅엔디언 4바이트다")
    void mp4BoxMustFitTheHeader() {
        assertThat(BoardMediaSignature.isMp4(ftyp(32, "mp42", 32))).isTrue();
        assertThat(BoardMediaSignature.isMp4(ftyp(36, "mp42", 32))).isFalse();
        // 0x00000110 = 272 — 위 바이트를 오른쪽으로 밀어 읽으면 16 이 되어 100바이트 헤더에 맞는 것처럼 보인다.
        assertThat(BoardMediaSignature.isMp4(ftyp(0x110, "isom", 100))).isFalse();
        assertThat(BoardMediaSignature.isMp4(ftyp(18, "isom", 32))).isFalse();
    }

    @Test
    @DisplayName("MP4: 주 브랜드가 영상 브랜드가 아니면(AVIF·HEIC) 받지 않는다")
    void mp4MajorBrandDecides() {
        assertThat(BoardMediaSignature.isMp4(ftyp(16, "avif", 16))).isFalse();
        assertThat(BoardMediaSignature.isMp4(ftyp(16, "heic", 16))).isFalse();
        byte[] notFtyp = ftyp(16, "isom", 16);
        notFtyp[4] = 'm';
        assertThat(BoardMediaSignature.isMp4(notFtyp)).isFalse();
    }

    @Test
    @DisplayName("WebM: DocType webm 을 담은 EBML Header 는 받는다 — 앞에 다른 원소가 있어도 같다")
    void webmWithDocType() {
        assertThat(BoardMediaSignature.isWebm(ebml(docType("webm")))).isTrue();
        assertThat(BoardMediaSignature.isWebm(ebml(concat(new byte[] {0x42, (byte) 0x86, (byte) 0x81, 0x01}, docType("webm"))))).isTrue();
        // 헤더 크기를 2바이트 가변 길이로 적어도 같다.
        byte[] body = docType("webm");
        assertThat(BoardMediaSignature.isWebm(concat(magic(), new byte[] {0x40, (byte) body.length}, body))).isTrue();
    }

    @Test
    @DisplayName("WebM: DocType 이 없거나 webm 이 아니거나 두 번이거나 길이가 4가 아니면 받지 않는다")
    void webmDocTypeRules() {
        assertThat(BoardMediaSignature.isWebm(ebml(new byte[] {0x42, (byte) 0x86, (byte) 0x81, 0x01}))).isFalse();
        assertThat(BoardMediaSignature.isWebm(ebml(docType("mkv ")))).isFalse();
        assertThat(BoardMediaSignature.isWebm(ebml(concat(docType("webm"), docType("webm"))))).isFalse();
        byte[] matroska = "matroska".getBytes(StandardCharsets.US_ASCII);
        assertThat(BoardMediaSignature.isWebm(ebml(concat(new byte[] {0x42, (byte) 0x82, (byte) (0x80 | matroska.length)}, matroska)))).isFalse();
    }

    @Test
    @DisplayName("WebM: 선언한 헤더·원소 크기가 읽은 바이트를 넘으면 받지 않는다(넘친 읽기 없이)")
    void webmDeclaredSizesMustFit() {
        byte[] body = docType("webm");
        // 헤더 크기를 실제보다 하나 크게 적는다.
        assertThat(BoardMediaSignature.isWebm(concat(magic(), new byte[] {(byte) (0x80 | (body.length + 1))}, body))).isFalse();
        // DocType 원소 크기를 헤더 끝보다 크게 적는다.
        byte[] overflow = {0x42, (byte) 0x82, (byte) 0x88, 'w', 'e', 'b', 'm'};
        assertThat(BoardMediaSignature.isWebm(ebml(overflow))).isFalse();
        assertThat(BoardMediaSignature.isWebm(new byte[] {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3})).isFalse();
    }

    @Test
    @DisplayName("WebM: 크기를 모르는 값(모든 값 비트가 1)·0 표지·잘린 가변 길이는 받지 않는다")
    void webmRejectsUnknownZeroAndTruncatedVints() {
        byte[] body = docType("webm");
        // 1바이트 크기 0xFF 는 '모름' 이다.
        assertThat(BoardMediaSignature.isWebm(concat(magic(), new byte[] {(byte) 0xFF}, body))).isFalse();
        // 2바이트 크기 0x7F 0xFF 도 '모름' 이다 — 0x7F 0xFE 는 아는 값이라 크기 넘침으로 따로 거부된다.
        assertThat(BoardMediaSignature.isWebm(concat(magic(), new byte[] {0x7F, (byte) 0xFF}, body))).isFalse();
        // 0 표지(첫 바이트 0x00)는 8바이트를 넘는 너비라 거부한다.
        assertThat(BoardMediaSignature.isWebm(concat(magic(), new byte[] {0x00, 0, 0, 0, 0, 0, 0, 0, 0}, body))).isFalse();
        // 2바이트 크기라고 표지했는데 바이트가 하나뿐이다.
        assertThat(BoardMediaSignature.isWebm(concat(magic(), new byte[] {0x40}))).isFalse();
        // 원소 ID 는 4바이트까지다 — 첫 바이트 0x08 은 5바이트 ID 다.
        assertThat(BoardMediaSignature.isWebm(ebml(new byte[] {0x08, 0x00, 0x00, 0x00, 0x00, (byte) 0x80}))).isFalse();
        // 원소 크기는 8바이트까지 받는다 — 8바이트 너비의 0 크기 원소 뒤 DocType 은 받는다.
        assertThat(BoardMediaSignature.isWebm(ebml(concat(new byte[] {0x42, (byte) 0x86, 0x01, 0, 0, 0, 0, 0, 0, 0}, docType("webm"))))).isTrue();
    }

    private static byte[] ftyp(int boxSize, String brand, int headerLength) {
        byte[] header = new byte[headerLength];
        header[0] = (byte) (boxSize >>> 24);
        header[1] = (byte) (boxSize >>> 16);
        header[2] = (byte) (boxSize >>> 8);
        header[3] = (byte) boxSize;
        System.arraycopy("ftyp".getBytes(StandardCharsets.US_ASCII), 0, header, 4, 4);
        System.arraycopy(brand.getBytes(StandardCharsets.US_ASCII), 0, header, 8, 4);
        return header;
    }

    private static byte[] magic() {
        return new byte[] {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3};
    }

    /** EBML Header — 크기를 1바이트 가변 길이로 적는다(본문 127바이트 미만). */
    private static byte[] ebml(byte[] body) {
        return concat(magic(), new byte[] {(byte) (0x80 | body.length)}, body);
    }

    private static byte[] docType(String value) {
        byte[] ascii = value.getBytes(StandardCharsets.US_ASCII);
        return concat(new byte[] {0x42, (byte) 0x82, (byte) (0x80 | ascii.length)}, ascii);
    }

    private static byte[] concat(byte[]... parts) {
        int length = 0;
        for (byte[] part : parts) length += part.length;
        byte[] joined = new byte[length];
        int offset = 0;
        for (byte[] part : parts) {
            System.arraycopy(part, 0, joined, offset, part.length);
            offset += part.length;
        }
        return joined;
    }
}
