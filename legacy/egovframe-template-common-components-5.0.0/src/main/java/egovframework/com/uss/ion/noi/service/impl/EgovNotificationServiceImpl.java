package egovframework.com.uss.ion.noi.service.impl;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.noi.service.EgovNotificationService;
import egovframework.com.uss.ion.noi.service.Notification;
import egovframework.com.uss.ion.noi.service.NotificationVO;
import jakarta.annotation.Resource;

/**
 * ?뺣낫?뚮┝?대? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.08
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.08  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("EgovNotificationService")
public class EgovNotificationServiceImpl extends EgovAbstractServiceImpl implements EgovNotificationService {

    @Resource(name="NotificationDAO")
    private NotificationDAO notificationDao;

    /**
     * ?뺣낫?뚮┝??紐⑸줉??議고쉶 ?쒕떎.
     */
    @Override
	public Map<String, Object> selectNotificationInfs(NotificationVO searchVO) throws Exception {
	List<NotificationVO> result = notificationDao.selectNotificationInfs(searchVO);
	int cnt = notificationDao.selectNotificationInfsCnt(searchVO);

	Map<String, Object> map = new HashMap<>();

	map.put("resultList", result);
	map.put("resultCnt", Integer.toString(cnt));

	return map;
    }

    /**
     * ?뺣낫?뚮┝???뺣낫瑜??깅줉?쒕떎.
     */
    @Override
	public void insertNotificationInf(Notification notification) throws Exception {
	//---------------------------------------
	// ?뚮┝?쇱옄 諛??쒖옉 吏??
	//---------------------------------------
	StringBuffer time = new StringBuffer();

	time.append(notification.getNtfcDate().replaceAll("-", ""));
	time.append(notification.getNtfcHH().length() == 1 ? "0" + notification.getNtfcHH() : notification.getNtfcHH());
	time.append(notification.getNtfcMM().length() == 1 ? "0" + notification.getNtfcMM() : notification.getNtfcMM());
	time.append("00");

	notification.setNtfcTime(time.toString());

	//---------------------------------------
	// ?ъ쟾 ?뚮┝媛꾧꺽 吏??
	//---------------------------------------
	StringBuffer interval = new StringBuffer();

	String[] array = notification.getBhNtfcIntrvl();

	//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
	if (array == null) {
		throw new RuntimeException("Method insertNotificationInf : array is null\n");
	}

	for (int i = 0; i < array.length; i++) {
	    if (i != 0) {
		interval.append(",");
	    }

	    interval.append(array[i]);
	}

	notification.setBhNtfcIntrvlString(interval.toString());

	//---------------------------------------
	// ?깅줉 泥섎━
	//---------------------------------------
	notificationDao.insertNotificationInf(notification);
    }

    /**
     * ?뚮┝硫붿떆吏??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     */
    @Override
	public NotificationVO selectNotificationInf(NotificationVO searchVO) throws Exception {
	return notificationDao.selectNotificationInf(searchVO);
    }

    /**
     * ?뺣낫?뚮┝???뺣낫瑜??섏젙?쒕떎.
     */
    @Override
	public void updateNotifictionInf(Notification notification) throws Exception {
	//---------------------------------------
	// ?뚮┝?쇱옄 諛??쒖옉 吏??
	//---------------------------------------
	StringBuffer time = new StringBuffer();

	time.append(notification.getNtfcDate().replaceAll("-", ""));
	time.append(notification.getNtfcHH().length() == 1 ? "0" + notification.getNtfcHH() : notification.getNtfcHH());
	time.append(notification.getNtfcMM().length() == 1 ? "0" + notification.getNtfcMM() : notification.getNtfcMM());
	time.append("00");

	notification.setNtfcTime(time.toString());

	//---------------------------------------
	// ?ъ쟾 ?뚮┝媛꾧꺽 吏??
	//---------------------------------------
	StringBuffer interval = new StringBuffer();

	String[] array = notification.getBhNtfcIntrvl();

	if (array != null) {

		for (int i = 0; i < array.length; i++) {
			if (i != 0) {
				interval.append(",");
			}

			interval.append(array[i]);
		}
	}

	notification.setBhNtfcIntrvlString(interval.toString());

	//---------------------------------------
	// ?섏젙 泥섎━
	//---------------------------------------
	notificationDao.updateNotificationInf(notification);
    }

    /**
     * ?뺣낫?뚮┝???뺣낫瑜???젣?쒕떎.
     */
    @Override
	public void deleteNotifictionInf(Notification notification) throws Exception {
	notificationDao.deleteNotificationInf(notification);
    }

    /**
     * ?뺣낫?뚮┝???뚮┝?쒓컙 ?깆뿉 ????먭????섑뻾?쒕떎.
     */
    @Override
	public boolean checkNotification(Notification notification) throws Exception {
	//---------------------------------------
	// ?뚮┝?쇱옄 諛??쒖옉 吏??
	//---------------------------------------
	StringBuffer time = new StringBuffer();

	time.append(notification.getNtfcDate().replaceAll("-", ""));
	time.append(notification.getNtfcHH().length() == 1 ? "0" + notification.getNtfcHH() : notification.getNtfcHH());
	time.append(notification.getNtfcMM().length() == 1 ? "0" + notification.getNtfcMM() : notification.getNtfcMM());
	time.append("00");

	//---------------------------------------
	// ?쒓컙 吏??
	//---------------------------------------
	SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
	Calendar alarm = Calendar.getInstance();
	alarm.setTime(formatter.parse(time.toString()));

	Calendar current = Calendar.getInstance();
	current.add(Calendar.MINUTE, -1);

	if (current.after(alarm)) {
	    return false;
	}

	return true;
    }

    private String getDateTimeWithoutSec(Calendar cal) {
	SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());

	return formatter.format(cal.getTime()).substring(0, 12);
    }

    /**
     * ?뺣낫?뚮┝???뺣낫 ?쒖떆瑜??섑뻾?쒕떎.
     */
    @Override
	public List<NotificationVO> selectNotificationData() throws Exception {
	List<NotificationVO> result = new ArrayList<>();

	//------------------------------------------
	// 寃??議곌굔 吏??
	//------------------------------------------
	NotificationVO vo = new NotificationVO();

	SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
	SimpleDateFormat other = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());

	// ?꾪썑 1?쒓컙 議곌굔 吏??.
	Calendar start = Calendar.getInstance();
	Calendar end = Calendar.getInstance();

	start.add(Calendar.HOUR, -1);
	end.add(Calendar.HOUR, 1);

	vo.setStartDateTime(formatter.format(start.getTime()));
	vo.setEndDateTime(formatter.format(end.getTime()));
	////----------------------------------------

	List<NotificationVO> target = notificationDao.getNotificationData(vo);

	Calendar current = Calendar.getInstance();
	for (int i = 0; i < target.size(); i++) {
	    vo = target.get(i);

	    String[] interval = ("0," + vo.getBhNtfcIntrvlString()).split(",");

	    for (String element : interval) {
		Calendar alarm = Calendar.getInstance();
		alarm.setTime(other.parse(vo.getNtfcTime()));

		alarm.add(Calendar.MINUTE, -1 * Integer.parseInt(element));

		if (getDateTimeWithoutSec(current).equals(getDateTimeWithoutSec(alarm))) {

		    result.add(vo);
		    break;
		}
	    }
	}

	return result;
    }
}
