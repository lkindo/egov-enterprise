package org.egovframe.rte.psl.dataaccess.util;

import java.util.LinkedHashMap;

/**

 * eGovFrame EgovMap ?          ??  ???

 * MyBatis          ??            ??SnakeCase ?                  ??CamelCase ??               ??   ???      .

 */

public class EgovMap extends LinkedHashMap<String, Object> {

    private static final long serialVersionUID = -7700790403928252416L;

    @Override

    public Object put(String key, Object value) {

        return super.put(convertToCamelCase(key), value);

    }

    private String convertToCamelCase(String s) {

        if (s == null)

            return null;

        if (s.indexOf('_') < 0 && Character.isLowerCase(s.charAt(0))) {

            return s;

        }

        StringBuilder result = new StringBuilder();

        boolean nextUpper = false;

        String lower = s.toLowerCase();

        for (int i = 0; i < lower.length(); i++) {

            char c = lower.charAt(i);

            if (c == '_') {

                nextUpper = true;

            } else {

                if (nextUpper) {

                    result.append(Character.toUpperCase(c));

                    nextUpper = false;

                } else {

                    result.append(c);

                }

            }

        }

        return result.toString();

    }

}
