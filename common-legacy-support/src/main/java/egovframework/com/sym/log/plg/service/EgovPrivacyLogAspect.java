package egovframework.com.sym.log.plg.service;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.aspectj.lang.JoinPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovHttpRequestHelper;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;

/**
 * ?? ????????? ? Advice
 * 
 * @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ????         ????
 *   2014.09.11  ???????    ????
 *   2025.07.12  ????         2025????????PMD???????? ????????-AssignmentInOperand(????? ????????? ??????????????????
 *   2025.07.12  ????         2025????????PMD???????? ????????-UnnecessaryBoxing(???WrapperObject ??)
 *
 *      </pre>
 **/
public class EgovPrivacyLogAspect {
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovPrivacyLogAspect.class);

	/** List ???? ???**/
	private int maxListCount = 10; // defalut : 10

	/** ??????? ????**/
	private Map<String, String> target = null;

	public void setMaxListCount(int maxListCount) {
		this.maxListCount = maxListCount;
	}

	public void setTarget(Map<String, String> target) {
		this.target = target;
	}

	private static final Object NO_METHOD = new Object();

	private final ClassValue<Map<String, Object>> methodCache = new ClassValue<Map<String, Object>>() {
		@Override
		protected Map<String, Object> computeValue(Class<?> type) {
			return new ConcurrentHashMap<>();
		}
	};

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

		if (returnVal instanceof List) { // List?? ???
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

					if (count >= maxListCount) { // ? ?????
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
			if (data.containsKey(key) && data.get(key) != null && !data.get(key).toString().trim().equals("")) { // ???
																													// ???
																													// ???
																													// ??
				list.add(target.get(key));

				LOGGER.debug("Service ('{}') : inquired data = {}", serviceName, key);
			}
		}

		return list;
	}

	protected List<String> getItemValues(Object data, String serviceName) {
		List<String> list = new ArrayList<String>();

		Class<?> clazz = data.getClass();
		Map<String, Object> methods = methodCache.get(clazz);

		for (String key : target.keySet()) {

			Object cached = methods.get(key);
			Method method = null;

			if (cached != null) {
				if (cached == NO_METHOD) {
					continue;
				}
				method = (Method) cached;
			} else {
				try {
					method = clazz.getMethod("get" + key.substring(0, 1).toUpperCase() + key.substring(1));
					methods.put(key, method);
				} catch (NoSuchMethodException ignore) {
					methods.put(key, NO_METHOD);
					LOGGER.error("[" + ignore.getClass() + "] Try/Catch... : " + ignore.getMessage());
					continue;
				} catch (Exception ignore) {
					LOGGER.error("[" + ignore.getClass() + "] Try/Catch... : " + ignore.getMessage());
					continue;
				}
			}

			try {
				Object returned = method.invoke(data);

				if (returned != null && !returned.toString().trim().equals("")) {
					list.add(target.get(key));
				}
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
		StringBuilder buffer = new StringBuilder();

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
