package nuri.business.service.file;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * 게시판 영상의 제한된 컨테이너 헤더 검사. codec 지원·전체 파일 무결성·악성코드 검사는 아니다.
 * MP4는 첫 ftyp box, WebM은 EBML Header 전체가 4KiB 안에 있어야 한다.
 * EBML 가변 길이 값은 RFC 8794의 ID/size 경계를 읽으며 문자열 검색으로 DocType을 찾지 않는다.
 */
final class BoardMediaSignature {
    static final int MAX_HEADER_BYTES = 4096;
    static final Set<String> EXTENSIONS = Set.of("mp4", "webm");
    private static final Set<String> MP4_BRANDS = Set.of(
            "isom", "iso2", "iso3", "iso4", "iso5", "iso6", "iso7", "iso8", "iso9",
            "mp41", "mp42", "avc1", "M4V ", "MSNV", "dash");

    private BoardMediaSignature() {}

    static boolean supportsExtension(String extension) {
        return EXTENSIONS.contains(extension);
    }

    static boolean isMp4(byte[] header) {
        if (header.length < 16 || !asciiAt(header, 4, "ftyp")) return false;
        long boxSize = 0;
        for (int index = 0; index < 4; index++) boxSize = (boxSize << 8) | (header[index] & 0xFF);
        if (boxSize < 16 || boxSize > header.length || boxSize % 4 != 0) return false;
        // Compatible brands alone must not turn an AVIF/HEIC major brand into MP4.
        return MP4_BRANDS.contains(new String(header, 8, 4, StandardCharsets.US_ASCII));
    }

    static boolean isWebm(byte[] header) {
        if (header.length < 5 || (header[0] & 0xFF) != 0x1A || (header[1] & 0xFF) != 0x45
                || (header[2] & 0xFF) != 0xDF || (header[3] & 0xFF) != 0xA3) return false;
        Vint headerSize = readVint(header, 4, header.length, false);
        if (headerSize == null || headerSize.value() > header.length - headerSize.next()) return false;
        int end = headerSize.next() + (int) headerSize.value();
        int cursor = headerSize.next();
        boolean foundDocType = false;
        while (cursor < end) {
            Vint id = readVint(header, cursor, end, true);
            if (id == null) return false;
            Vint size = readVint(header, id.next(), end, false);
            if (size == null || size.value() > end - size.next()) return false;
            if (id.value() == 0x4282) {
                if (foundDocType || size.value() != 4 || !asciiAt(header, size.next(), "webm")) return false;
                foundDocType = true;
            }
            cursor = size.next() + (int) size.value();
        }
        return foundDocType;
    }

    /** Unknown sizes, zero markers and truncated values are rejected before advancing. */
    private static Vint readVint(byte[] bytes, int offset, int end, boolean elementId) {
        if (offset >= end) return null;
        int first = bytes[offset] & 0xFF;
        int marker = 0x80;
        int width = 1;
        int maxWidth = elementId ? 4 : 8;
        while (width <= maxWidth && (first & marker) == 0) {
            marker >>= 1;
            width++;
        }
        if (width > maxWidth || width > end - offset) return null;
        long value = elementId ? first : first & (marker - 1);
        boolean unknownSize = !elementId && value == marker - 1;
        for (int index = 1; index < width; index++) {
            int next = bytes[offset + index] & 0xFF;
            value = (value << 8) | next;
            unknownSize &= next == 0xFF;
        }
        if (unknownSize) return null;
        return new Vint(value, offset + width);
    }

    private static boolean asciiAt(byte[] bytes, int offset, String value) {
        if (offset < 0 || value.length() > bytes.length - offset) return false;
        for (int index = 0; index < value.length(); index++) {
            if ((bytes[offset + index] & 0xFF) != value.charAt(index)) return false;
        }
        return true;
    }

    private record Vint(long value, int next) {}
}
