package egovframework.com.sym.log.plg.service;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.aspectj.lang.JoinPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovHttpRequestHelper;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;

/**
 * 媛쒖씤?뺣낫 議고쉶 ?대젰 愿由щ? ?꾪븳 Advice
 * 
 * @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?띻만??         理쒖큹 ?앹꽦
 *   2014.09.11  ?쒖??꾨젅?꾩썙??    理쒖큹 ?앹꽦
 *   2025.07.12  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AssignmentInOperand(?쇱뿰?곗옄?댁뿉 ?좊떦臾몄씠 ?ъ슜?? ?대떦 肄붾뱶瑜?蹂듭옟?섍퀬 媛?낆꽦???⑥뼱吏寃?留뚮벉)
 *   2025.07.12  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 WrapperObject ?앹꽦)
 *
 *      </pre>
 */
public class EgovPrivacyLogAspect {
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovPrivacyLogAspect.class);

	/** List 湲곕줉 ??理쒕? 湲곕줉 ??*/
	private int maxListCount = 10; // defalut : 10

	/** 湲곕줉 ???媛쒖씤?뺣낫 ??ぉ */
	private Map<String, String> target = null;

	public void setMaxListCount(int maxListCount) {
		this.maxListCount = maxListCount;
	}

	public void setTarget(Map<String, String> target) {
		this.target = target;
	}

	@Resource(name = "egovPrivacyLogService")
	private EgovPrivacyLogService privacyLogService;

	public void insertLog(JoinPoint joinPoint, Object returnVal) throws Throwable {

		String className = joinPoint.getTarget().getClass().getCanonicalName();
		String methodName = joinPoint.getSignature().getName();

		String serviceName = className + "." + methodName;

		if (!EgovHttpRequestHelper.isInHttpRequest()) {
			LOGGER.info("{} service called, but it isn't in HTTP request...", serviceName);
			return;
		}

		if (returnVal instanceof List) { // List?대ŉ 媛쒕퀎 湲곕줉
			int count = 0;

			for (Object item : (List<?>) returnVal) {
				List<String> list = null;
				if (item instanceof Map) {
					list = getItemValues((Map<?, ?>) item, serviceName);
				} else { // general VO
					list = getItemValues(item, serviceName);
				}

				if (list.size() > 0) {
					privacyLogService.innerInsertPrivacyLog(getPrivacyLogFromItemList(list, serviceName));

					++count;

					if (count >= maxListCount) { // 理쒕? 湲곕줉 ??泥섎━
						LOGGER.info("Max List count reached (skip next list) : maxListCount = {}, target = {}",
								maxListCount, serviceName);
						break;
					}
				}
			}
		} else if (returnVal instanceof Map) {
			List<String> list = getItemValues((Map<?, ?>) returnVal, serviceName);

			if (list.size() > 0) {
				privacyLogService.innerInsertPrivacyLog(getPrivacyLogFromItemList(list, serviceName));
			}
		} else { // general VO
			List<String> list = getItemValues(returnVal, serviceName);

			if (list.size() > 0) {
				privacyLogService.innerInsertPrivacyLog(getPrivacyLogFromItemList(list, serviceName));
			}
		}

	}

	protected List<String> getItemValues(Map<?, ?> data, String serviceName) {
		List<String> list = new ArrayList<String>();

		for (String key : target.keySet()) {
			if (data.containsKey(key) && data.get(key) != null && !data.get(key).toString().trim().equals("")) { // 議고쉶??
																													// ?곗씠?곌?
																													// ?놁쑝硫?
																													// ?앸왂
				list.add(target.get(key));

				LOGGER.debug("Service ('{}') : inquired data = {}", serviceName, key);
			}
		}

		return list;
	}

	protected List<String> getItemValues(Object data, String serviceName) {
		List<String> list = new ArrayList<String>();

		for (String key : target.keySet()) {

			try {
				Method method = data.getClass().getMethod("get" + key.substring(0, 1).toUpperCase() + key.substring(1));

				Object returned = method.invoke(data);

				if (returned != null && !returned.toString().trim().equals("")) {
					list.add(target.get(key));
				}
			} catch (NoSuchMethodException ignore) {
				LOGGER.error("[" + ignore.getClass() + "] Try/Catch... : " + ignore.getMessage());
				continue;
			} catch (IllegalAccessException ignore) {
				LOGGER.error("[" + ignore.getClass() + "] Try/Catch... : " + ignore.getMessage());
				continue;
			} catch (IllegalArgumentException ignore) {
				LOGGER.error("[" + ignore.getClass() + "] Try/Catch... : " + ignore.getMessage());
				continue;
			} catch (InvocationTargetException ignore) {
				LOGGER.error("[" + ignore.getClass() + "] Try/Catch... : " + ignore.getMessage());
				continue;
			} catch (NullPointerException ignore) {
				LOGGER.error("[" + ignore.getClass() + "] Try/Catch... : " + ignore.getMessage());
				continue;
			}

			LOGGER.debug("Service ('{}') : inquired data = {}", serviceName, key);
		}

		return list;
	}

	private PrivacyLog getPrivacyLogFromItemList(List<String> list, String serviceName) {
		PrivacyLog log = new PrivacyLog();

		log.setServiceName(serviceName);
		log.setInquiryInfo(getStringFromItemList(list));

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO != null) {
			log.setRequesterId(loginVO.getUniqId());
		}

		log.setRequesterIp(EgovHttpRequestHelper.getRequestIp());

		return log;
	}

	private String getStringFromItemList(List<String> list) {
		StringBuffer buffer = new StringBuffer();

		for (String item : list) {
			if (buffer.length() != 0) {
				buffer.append(",").append(item);
			} else {
				buffer.append(item);
			}
		}
		return buffer.toString();
	}
}
