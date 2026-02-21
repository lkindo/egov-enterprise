package egovframework.com.cmm.util;

import java.lang.reflect.Array;
import java.util.Collection;
import java.util.Map;

/**
 * EgovMybatisUtil ?????
 *
 * @author ???
 * @since 2016.06.07
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2016.06.07  ???         ????
 *   2017.03.03  ??         ??????ES)-?? ??????? ??[CWE-209]
 *   2017.07.21  ???         isEquals?? String Character ??????
 *   2023.05.01  ????         ???? ?? ????? ?? ? ???<e>???????????????????
 *   2025.05.28  ????         PMD???????? ????????-FieldNamingConventions(? ???, UselessParentheses(??? ???
 *
 *      </pre>
 **/
public class EgovMybatisUtil {

	/**
	 * Empty ????????.
	 * 
	 * @param o Object
	 * @return boolean
	 * @exception IllegalArgumentException
	 **/
	public static boolean isEmpty(Object o) {
		if (o == null) {
			return true;
		}

		if (o instanceof String) {
			if (((String) o).length() == 0) {
				return true;
			}
		} else if (o instanceof Collection) {
			if (((Collection<?>) o).isEmpty()) {
				return true;
			}
		} else if (o.getClass().isArray()) {
			if (Array.getLength(o) == 0) {
				return true;
			}
		} else if (o instanceof Map) {
			if (((Map<?, ?>) o).isEmpty()) {
				return true;
			}
		} else {
			return false;
		}

		return false;
	}

	/**
	 * Not Empty ????????.
	 * 
	 * @param o Object
	 * @return boolean
	 * @exception IllegalArgumentException
	 **/
	public static boolean isNotEmpty(Object o) {
		return !isEmpty(o);
	}

	/**
	 * Equal ????????.
	 * 
	 * @param obj Object, obj Object
	 * @return boolean
	 **/

	public static boolean isEquals(Object obj, Object obj2) {
		if (isEmpty(obj)) {
			return false;
		}

		if (obj instanceof String && obj2 instanceof String) {
			if (String.valueOf(obj).equals(String.valueOf(obj2))) {
				return true;
			}
		} else if (obj instanceof String && obj2 instanceof Character) {
			if (String.valueOf(obj).equals(String.valueOf(obj2))) {
				return true;
			}
		} else if (obj instanceof String && obj2 instanceof Integer) {
			if (String.valueOf(obj).equals(String.valueOf(obj2))) {
				return true;
			}

		} else if (obj instanceof Integer && obj2 instanceof String) {
			if (String.valueOf(obj2).equals(String.valueOf(obj))) {
				return true;
			}
		} else if (obj instanceof Integer && obj2 instanceof Integer) {
			if ((Integer) obj == (Integer) obj2) {
				return true;
			}
		}

		return false;
	}

	/**
	 * String??Equal ????????.
	 * 
	 * @param obj Object, obj Object
	 * @return boolean
	 **/
	public static boolean isEqualsStr(Object obj, String s) {
		if (isEmpty(obj)) {
			return false;
		}

		if (String.valueOf(obj).equals(s)) {
			return true;
		}
		return false;
	}

}
