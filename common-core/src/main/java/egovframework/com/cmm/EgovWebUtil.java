package egovframework.com.cmm;

import java.io.File;

/**
 * 교차접속 스크립트 공격 취약성 방지(파라미터 문자열 교체)
 */
public class EgovWebUtil {
    public static String clearXSSMinimum(String value) {
        if (value == null || value.trim().equals("")) {
            return "";
        }

        String returnValue = value;

        returnValue = returnValue.replaceAll("&", "&amp;");
        returnValue = returnValue.replaceAll("<", "&lt;");
        returnValue = returnValue.replaceAll(">", "&gt;");
        returnValue = returnValue.replaceAll("\"", "&#34;");
        returnValue = returnValue.replaceAll("\'", "&#39;");
        returnValue = returnValue.replaceAll("\\.", "&#46;");
        returnValue = returnValue.replaceAll("%2E", "&#46;");
        returnValue = returnValue.replaceAll("%2F", "&#47;");
        return returnValue;
    }

    public static String clearXSSMaximum(String value) {
        String returnValue = value;
        returnValue = clearXSSMinimum(returnValue);
        returnValue = returnValue.replaceAll("%00", "");
        returnValue = returnValue.replaceAll("%", "&#37;");
        returnValue = returnValue.replaceAll("\\.\\./", "");
        returnValue = returnValue.replaceAll("\\.\\.\\\\", "");
        returnValue = returnValue.replaceAll("\\./", "");
        returnValue = returnValue.replaceAll("%2F", "");
        return returnValue;
    }

    public static String filePathBlackList(String value) {
        String returnValue = value;
        if (returnValue == null || returnValue.trim().equals("")) {
            return "";
        }
        while (returnValue.contains("..")) {
            returnValue = returnValue.replace("..", "");
        }
        return returnValue;
    }

    public static String filePathBlackList(String value, String basePath) {
        if (basePath == null || "".equals(basePath))
            throw new SecurityException("base path is empty.");
        if (File.separator.equals(basePath) || "/".equals(basePath))
            throw new SecurityException("base path does not allow Root.");
        return filePathBlackList(basePath + value);
    }

    public static String filePathReplaceAll(String value) {
        String returnValue = value;
        if (returnValue == null || returnValue.trim().equals("")) {
            return "";
        }
        returnValue = returnValue.replaceAll("/", "");
        returnValue = returnValue.replaceAll("\\\\", "");
        returnValue = returnValue.replaceAll("\\.\\.", "");
        returnValue = returnValue.replaceAll("&", "");
        return returnValue;
    }

    public static String removeCRLF(String parameter) {
        return parameter.replaceAll("\r", "").replaceAll("\n", "");
    }
}
