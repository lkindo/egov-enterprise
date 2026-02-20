package egovframework.com.cmm;

import java.io.File;

/**
 * ?대Ŋ媛?臾믩꺗 ??쎄쾿?깆????⑤벀爰??띯뫁鍮??獄쎻뫗?(???뵬沃섎챸苑??얜챷????대Ŋ猿?
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
