package egovframework.com.cmm.util;

import java.lang.reflect.Array;
import java.util.Collection;
import java.util.Map;

/**
 * EgovMybatisUtil ?대옒??
 *
 * @author ?λ룞??
 * @since 2016.06.07
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2016.06.07  ?λ룞??         理쒖큹 ?앹꽦
 *   2017.03.03  議곗꽦??         ?쒗걧?댁퐫??ES)-?ㅻ쪟 硫붿떆吏瑜??듯븳 ?뺣낫?몄텧[CWE-209]
 *   2017.07.21  ?λ룞??         isEquals?먯꽌 String Character 鍮꾧탳 媛?ν븯?꾨줉
 *   2023.05.01  ?대갚??         而щ젆?섏? ?먯떆 ?좏삎?낅땲?? ?쇰컲 ?좏삎 而щ젆??<e>?????李몄“??留ㅺ컻 蹂?섑솕?섏뼱?쇳빀?덈떎
 *   2025.05.28  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃), UselessParentheses(?몃え?녿뒗 愿꾪샇)
 *
 *      </pre>
 */
public class EgovMybatisUtil {

	/**
	 * Empty ?щ?瑜??뺤씤?쒕떎.
	 * 
	 * @param o Object
	 * @return boolean
	 * @exception IllegalArgumentException
	 */
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
	 * Not Empty ?щ?瑜??뺤씤?쒕떎.
	 * 
	 * @param o Object
	 * @return boolean
	 * @exception IllegalArgumentException
	 */
	public static boolean isNotEmpty(Object o) {
		return !isEmpty(o);
	}

	/**
	 * Equal ?щ?瑜??뺤씤?쒕떎.
	 * 
	 * @param obj Object, obj Object
	 * @return boolean
	 */

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
	 * String??Equal ?щ?瑜??뺤씤?쒕떎.
	 * 
	 * @param obj Object, obj Object
	 * @return boolean
	 */
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
