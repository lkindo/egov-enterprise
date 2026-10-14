package nuri.migration.appscan;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 리더들이 함께 쓰는 소스 글자 도우미 — 줄 번호와 주석 지우기. */
final class SourceText {

    private SourceText() {}

    /** {@code offset} 위치가 있는 줄 번호(1부터). */
    static int lineOf(String text, int offset) {
        int line = 1;
        int end = Math.min(offset, text.length());
        for (int index = 0; index < end; index++) {
            if (text.charAt(index) == '\n') {
                line++;
            }
        }
        return line;
    }

    /** 패턴에 맞는 부분을 같은 길이의 공백으로 바꾼다. 줄바꿈은 남겨 위치와 줄 번호를 지킨다. */
    static String blank(String text, Pattern... patterns) {
        StringBuilder blanked = new StringBuilder(text);
        for (Pattern pattern : patterns) {
            Matcher match = pattern.matcher(blanked.toString());
            while (match.find()) {
                for (int index = match.start(); index < match.end(); index++) {
                    if (blanked.charAt(index) != '\n') {
                        blanked.setCharAt(index, ' ');
                    }
                }
            }
        }
        return blanked.toString();
    }
}
