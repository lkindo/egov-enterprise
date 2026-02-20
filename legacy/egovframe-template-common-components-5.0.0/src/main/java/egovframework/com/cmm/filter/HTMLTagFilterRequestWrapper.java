/*
 * Copyright 2008-2009 MOPAS(MINISTRY OF SECURITY AND PUBLIC ADMINISTRATION).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package egovframework.com.cmm.filter;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

/**
 *
 * HTMLTagFilterRequestWrapper
 * 
 * @author 怨듯넻而댄룷?뚰듃 ? ?좎슜??
 * @since 2018.03.21
 * @version 3.9.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2018.03.21  ?좎슜??         getParameterMap()援ы쁽 異붽?
 *   2019.01.31  ?좎슜??         whiteList ?쒓렇 異붽?
 *   2025.05.24  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SimplifyBooleanExpressions(遺???쒗쁽???⑥닚??, AvoidReassigningParameters(留ㅺ컻蹂???ы븷??諛⑹?)
 *
 *      </pre>
 */

public class HTMLTagFilterRequestWrapper extends HttpServletRequestWrapper {

	// Tag ?붿씠??由ъ뒪??( ?덉슜???쒓렇 ?깅줉 )
	static private String[] whiteListTag = { "<p>", "</p>", "<br />" };

	public HTMLTagFilterRequestWrapper(HttpServletRequest request) {
		super(request);
	}

	@Override
	public String[] getParameterValues(String parameter) {

		String[] values = super.getParameterValues(parameter);

		if (values == null) {
			return null;
		}

		for (int i = 0; i < values.length; i++) {
			if (values[i] != null) {
				values[i] = getSafeParamData(values[i]);
				//System.out.println( "[HTMLTagFilter getParameterValues] "+ parameter + "===>>>"+values[i] );
			} else {
				values[i] = null;
			}
		}

		return values;
	}

	@Override
	public String getParameter(String parameter) {

		String value = super.getParameter(parameter);

		if (value == null) {
			return null;
		}

		value = getSafeParamData(value);
		//System.out.println( "[HTMLTagFilter getParameter] "+ parameter + "===>>>"+value );
		return value;
	}

	/**
	 * Map?쇰줈 諛붿씤?⑸맂 寃쎌슦瑜?泥섎━?쒕떎.
	 *
	 * @return Map - String Type Key / String諛곗뿴???媛?
	 */
	@Override
	public Map<String, String[]> getParameterMap() {
		Map<String, String[]> valueMap = super.getParameterMap();

		String[] values;
		for (String key : valueMap.keySet()) {
			values = valueMap.get(key);

			for (int i = 0; i < values.length; i++) {
				if (values[i] != null) {
					values[i] = getSafeParamData(values[i]);
    				//System.out.println( "[HTMLTagFilter getParameterMap] "+ key + "===>>>"+values[i] );
				} else {
					values[i] = null;
				}
			}

            //System.out.println( String.format("??: %s, 媛?: %s", key, valueMap.get(key)) );
		}

		return valueMap;
	}

	private String getSafeParamData(String value) {
		StringBuffer strBuff = new StringBuffer();

		for (int i = 0; i < value.length(); i++) {
			char c = value.charAt(i);
			switch (c) {
			case '<':
				if (!checkNextWhiteListTag(i, value)) {
					strBuff.append("&lt;");
				} else {
					strBuff.append(c);
				}
				//System.out.println("checkNextWhiteListTag = "+checkNextWhiteListTag(i, value));
				break;
			case '>':
				if (!checkPrevWhiteListTag(i, value)) {
					strBuff.append("&gt;");
				} else {
					strBuff.append(c);
				}
				//System.out.println("checkPrevWhiteListTag = "+checkPrevWhiteListTag(i, value));
				break;
			// case '&':
			// strBuff.append("&amp;");
			// break;
			case '"':
				strBuff.append("&quot;");
				break;
			case '\'':
				strBuff.append("&apos;");
				break;
			case '(':
				strBuff.append("&#40;");
				break;
			case ')':
				strBuff.append("&#41;");
				break;
			// case '.':
			// strBuff.append("&#46;");
			// break;
			default:
				strBuff.append(c);
				break;
			}
		}

		return strBuff.toString();
	}

	private boolean checkNextWhiteListTag(int index, String data) {
		String extractData = "";
		// int beginIndex = 0;
		int endIndex = 0;
		for (String whiteListData : whiteListTag) {
			// System.out.println("===>>> whiteListData="+whiteListData);
			endIndex = index + whiteListData.length();
			if (data.length() > endIndex) {
				extractData = data.substring(index, endIndex);
			} else {
				extractData = "";
			}
			// System.out.println("extractData="+extractData);
			if (whiteListData.equals(extractData)) {
				return true; // whiteList ??곸쑝濡??먯젙
			}
		}

		return false;
	}

	private boolean checkPrevWhiteListTag(int index, String data) {
		String extractData = "";
		int beginIndex = 0;
		int endIndex = 0;
		for (String whiteListData : whiteListTag) {
			// System.out.println("===>>> whiteListData="+whiteListData);
			beginIndex = index - whiteListData.length() + 1;
			endIndex = index + 1;
			// System.out.println(" range ["+beginIndex+" ~ "+endIndex+"]");
			if (beginIndex >= 0) {
				extractData = data.substring(beginIndex, endIndex);
			} else {
				extractData = "";
			}
			// System.out.println("extractData="+extractData);
			if (whiteListData.equals(extractData)) {
				return true; // whiteList ??곸쑝濡??먯젙
			}
		}

		return false;
	}

}