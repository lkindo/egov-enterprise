package egovframework.com.cop.sms.service.impl;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cop.sms.service.SmsRecptn;
import x3.client.smeapi.SMEConnection;
import x3.client.smeapi.SMEConnectionFactory;
import x3.client.smeapi.SMEException;
import x3.client.smeapi.SMEListener;
import x3.client.smeapi.SMEMessage;
import x3.client.smeapi.SMEReceiver;
import x3.client.smeapi.SMEReport;
import x3.client.smeapi.SMESession;
import x3.client.smeapi.impl.SMEConfig;
import x3.client.smeapi.impl.SMEConnectionFactoryImpl;
import x3.client.smeapi.impl.SMELogger;

/**
 * 臾몄옄硫붿떆吏 ?곕룞 寃곌낵 ?섏떊 泥섎━瑜??꾪븳 ?대옒??(?꾨젅?꾩썙??鍮꾩쥌??踰꾩쟾)
 * 
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.11.24
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.11.24  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2011.10.10  ?닿린??         蹂댁븞?먭? ?꾩냽珥덉튂(?붾쾭嫄곗퐫??二쇱꽍泥섎━)
 *   2017.03.07  議곗꽦??         ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2025.06.05  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ImmutableField(遺덈??꾨뱶)
 *
 *      </pre>
 */
public class EgovSmsBasicReceiver implements SMEListener {
	private final SmsBasicDAO smsDao = new SmsBasicDAO();

	private final String smeConfigPath = null;

	/** SMS ?쒕쾭 URL */
	private String connString = null; // ex) sme://000.000.000.000:20000
	/** SMS ?곌퀎 ID */
	private String smsId = null;
	/** SMS ?곌퀎 password */
	private String smsPwd = null;

	/** SMS G/W Connection Factory */
	private SMEConnectionFactory factReceiver = null;
	/** SMS G/W Connection */
	private SMEConnection connReceiver = null;
	/** SMS G/W Session */
	private SMESession sessReceiver = null;
	/** SMS G/W Receiver */
	private SMEReceiver receiver = null;

	/** ?곌껐 ?щ? */
	@SuppressWarnings("unused")
	private boolean isConnected = false;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSmsBasicReceiver.class);

	/**
	 * SMS 寃곌낵 ?섏떊???꾪븳 Connection 諛?Session ?앹꽦?쒕떎.
	 *
	 * @throws SMEException
	 */
	public void open() throws SMEException {
		this.factReceiver = new SMEConnectionFactoryImpl(connString);
		this.connReceiver = factReceiver.createConnection(smsId, smsPwd); // ?꾩씠?붿? ?⑥뒪?뚮뱶?낅땲??
		this.sessReceiver = connReceiver.createSession();

		this.receiver = sessReceiver.createReceiver();
		this.receiver.setListener(this);
		this.connReceiver.start();

		isConnected = true;
	}

	/**
	 * SMS 寃곌낵 ?섏떊???꾪븳 Connection 諛?Session ?댁젣?쒕떎.
	 */
	public void close() {
		try {
			if (receiver != null) {
				receiver.close();
			}
		} catch (SMEException ignore) {
			LOGGER.debug(ignore.getMessage());
		}

		try {
			if (sessReceiver != null) {
				sessReceiver.close();
			}
		} catch (SMEException ignore) {
			LOGGER.debug(ignore.getMessage());
		}

		try {
			if (connReceiver != null) {
				connReceiver.close();
			}
		} catch (SMEException ignore) {
			LOGGER.error("Exception: {}", ignore.getClass().getName());
			LOGGER.error("Exception  Message: {}", ignore.getMessage());
		}
	}

	public void readPropertyFile() {

		connString = SMEConfig.getSmsUrl();
		smsId = SMEConfig.getSmsId();
		smsPwd = SMEConfig.getSmsPwd();

		String tmp = null;

		tmp = SMEConfig.getLogLevel();
		if (tmp != null && !tmp.equals("")) {
			SMELogger.setLogLevel(tmp);
		}

		tmp = SMEConfig.getLogLayout();
		if (tmp != null && !tmp.equals("")) {
			SMELogger.setLogLayout(tmp);
		}

		tmp = SMEConfig.getLogPath();
		if (tmp != null && !tmp.equals("")) {
			SMELogger.setLogPath(tmp);
		}

		SMELogger.setUseConsoleLogger(SMEConfig.getUseConsoleLogger());
		SMELogger.setUseFileLogger(SMEConfig.getUseFileLogger());
	}

	/**
	 * 寃곌낵??????섏떊 泥섎━瑜??쒕떎.
	 */
	@Override
	public void onMessage(SMEReport msg) {
		if (msg instanceof SMEReport) {
			if (msg.isConnected()) {
				SMEReport rpt = msg;
				String msgId = rpt.getMessageId();
				int nRes = rpt.getResult(); // 寃곌낵肄붾뱶
				String doneTime = rpt.getDeliverTime(); // ?대룞?듭떊??寃곌낵泥섎━?쒓컙-?⑤쭚湲곗뿉 ?꾨떖???쒓컙(?대룞?듭떊???앹꽦)
				String netCode = rpt.getDestination(); // ?대룞?듭떊???뺣낫

				// System.out.println("Receiver Number is :" +
				// ((SMEReportImpl)rpt).receiver.activeCount()); // 二쇱꽍泥섎━

				String resultMsg = "";

				switch (nRes) {
				case 0:
					resultMsg = "";
					break;
				case 4001:
					resultMsg = "?섎せ???꾪솕踰덊샇; 李⑹떊 ?댄넻?щ? 寃곗젙?????놁쓬";
					break;
				case 4002:
					resultMsg = "MessageID 以묐났";
					break;
				case 4005:
					resultMsg = "?ㅽ뙵 硫붿떆吏濡?泥섎━ 嫄곕???;
					break;
				case 4006:
					resultMsg = "?ㅽ뙵 肄쒕갚踰덊샇濡?泥섎━ 嫄곕???;
					break;
				case 5000:
					resultMsg = "SMG Server ?대? ?먮윭 (?몄쬆?ㅽ뙣,?곌껐?ㅽ뙣)";
					break;
				case 5050:
					resultMsg = "李⑹떊 ?댄넻???곕룞 ?ㅽ뙣";
					break;
				case 6000:
					resultMsg = "?댄넻???쒖뒪???μ븷";
					break;
				case 6001:
					resultMsg = "?댄넻??硫붿떆吏 ?뺤떇 ?ㅻ쪟";
					break;
				case 6002:
					resultMsg = "?댄넻??李⑹떊踰덊샇 ?몄쬆 ?먮윭";
					break;
				case 6003:
					resultMsg = "?댄넻???ㅽ뙵 硫붿떆吏濡?泥섎━ 嫄곕???;
					break;
				case 6004:
					resultMsg = "?댄넻???쒓컙 ?꾩넚???쒗븳 珥덇낵";
					break;
				case 6005:
					resultMsg = "?댄넻?????꾩넚???쒗븳 珥덇낵";
					break;
				case 6006:
					resultMsg = "?댄넻??Resource ?쒗븳???섑븳 ?꾩넚 ?쒖뼱";
					break;
				case 6007:
					resultMsg = "?댄넻??Resource full";
					break;
				case 6008:
					resultMsg = "?댄넻??踰덊샇?대룞 ?쒖뒪???μ븷";
					break;
				case 6009:
					resultMsg = "?댄넻??硫붿떆吏 ????ㅻ쪟";
					break;
				case 6010:
					resultMsg = "?댄넻???꾩넚 ?ㅽ뙣";
					break;
				case 6011:
					resultMsg = "?댄넻??硫붿떆吏 ?꾩넚遺덇?(?⑤쭚湲곗뿉??李⑹떊 嫄곕?)";
					break;
				case 6012:
					resultMsg = "?댄넻???꾩넚 ?ㅽ뙣(臾댁꽑留앸떒)";
					break;
				case 6013:
					resultMsg = "?댄넻???꾩넚 ?ㅽ뙣(臾댁꽑留?-> ?⑤쭚湲곕떒)";
					break;
				case 6014:
					resultMsg = "?댄넻???섏떊 ?⑤쭚湲??뺤떇 ?ㅻ쪟";
					break;
				case 6015:
					resultMsg = "?댄넻??Unknown Error";
					break;
				case 7000:
					resultMsg = "?섏떊 ?⑤쭚湲??꾩썝爰쇱쭚";
					break;
				case 7001:
					resultMsg = "?섏떊 ?⑤쭚湲?硫붿떆吏 踰꾪띁 ?";
					break;
				case 7002:
					resultMsg = "?섏떊 ?⑤쭚湲??뚯쁺吏??;
					break;
				case 7003:
					resultMsg = "?섏떊 ?⑤쭚湲?硫붿떆吏 ??젣??;
					break;
				default:
					resultMsg = "?????녿뒗 ?ㅻ쪟 諛쒖깮";
				}

				if (nRes != SMEMessage.RESULT_SUCCESS) {
					// System.out.println("SMSMessage (msgId = " + msgId + ") report = " +
					// rpt.getResult());
					LOGGER.info("MessageId   : {}", msgId);
					LOGGER.info("Result      : {}", nRes);
					LOGGER.info("Result Msg. : {}", resultMsg);
					LOGGER.info("Done Time   : {}", doneTime);
					LOGGER.info("Net Code    : {}", netCode);
				} else {
					// System.out.println("SMEMessage (msgId = " + msgId + ") report = " +
					// rpt.getResult());
					LOGGER.info("MessageId   : {}", msgId);
					LOGGER.info("Result      : {}", nRes);
					LOGGER.info("Result Msg. : {}", resultMsg);
					LOGGER.info("Done Time   : {}", doneTime);
					LOGGER.info("Net Code    : {}", netCode);
				}

				// Spring context?먯꽌 ?몄텧??寃쎌슦留?DB瑜?泥섎━??
				if (smeConfigPath != null) {
					SmsRecptn recptn = new SmsRecptn();

					recptn.setSmsId(msgId.substring(0, 20)); // SMS_ID + "-" + ?섏떊?꾪솕踰덊샇
					recptn.setRecptnTelno(msgId.substring(21)); // "-" ?쒖쇅

					recptn.setResultCode(Integer.toString(nRes));
					recptn.setResultMssage(resultMsg);

					try {
						smsDao.updateSmsRecptnInf(recptn);
						// 2017.02.08 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
					} catch (IOException ex) {
//						LOGGER.error("Exception: {
                    }", ex.getClass().getName());
//						LOGGER.error("Exception  Message: {
                    }", ex.getMessage());
						LOGGER.error("[IOException] : Connection Close");
					} catch (Exception ex) {
						LOGGER.error("[" + ex.getClass() + "] Connection Close : ", ex.getMessage());
					}
				}
			} else {
				LOGGER.debug("SMEReceiver Disconnected!!");
				isConnected = false;
			}
		}
	}

	/**
	 * 寃곌낵 ?섏떊???꾪븳 daemon??湲곕룞?쒕떎.
	 *
	 * @param args
	 */
	// 2022.01. Exit methods should not be called 泥섎━ - ?덉젣?대?濡?二쇱꽍 泥섎━
	/*
	 * public static void mainExample(String[] args) { if (args.length < 1) {
	 * LOGGER.error("SMEConfig.conf file full path needed."); LOGGER.
	 * error("ex) java [JVM Options] [className] /home/egovframe/conf/SMEConfig.conf"
	 * ); System.exit(-1); }
	 * 
	 * EgovSmsBasicReceiver receiver = new EgovSmsBasicReceiver();
	 * 
	 * try { try { SMEConfig.configSet(args[0]); receiver.readPropertyFile();
	 * 
	 * } catch (Exception ex) { // LOGGER.error("DEBUG: {
                    }", ex.getMessage());
	 * //2017.03.07 議곗꽦???쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
	 * LOGGER.error("["+ ex.getClass() +"] : Connection Close ", ex.getMessage());
	 * return; }
	 * 
	 * // 寃곌낵 ?섏떊???꾪빐??由ы룷???몄뀡???묒냽?쒕떎. // ?꾨줈洹몃옩 ?쒖옉??理쒖큹 ?쒕쾲留??댁??? receiver.open();
	 * 
	 * long startTimestamp = System.currentTimeMillis(); long nowTimestamp = 0; long
	 * limitTimeInterval = (60)*60*1000; //60遺꾧컙?쇰줈 ?쒗븳
	 * 
	 * // ?곕が??醫낅즺?덈릺?꾨줉 10珥덉뵫 ?щ㈃??猷⑦봽瑜??뚮졇?듬땲?? // ?ㅼ젣 ?ъ슜 紐⑹쟻??留욊쾶??怨좎퀜二쇱떆硫??⑸땲?? while (true) {
	 * // ?곌껐???좎??댁빞?섎뒗???쒕쾭痢≪뿉???몄뀡???딆뼱踰꾨━嫄곕굹 // ?ㅽ듃?뚰겕 媛꾩꽠 ?먮뒗 ?μ븷 ?곹솴?쇰줈 ?곌껐???딄꼈??寃쎌슦 ?ъ젒?랁븷 ???덈룄濡?
	 * 泥섎━ //if (receiver.isConnected == false) { if (!receiver.isConnected) { //
	 * recommended by PMD receiver.close(); Thread.sleep(10000); receiver.open(); }
	 * 
	 * Thread.sleep(10000); nowTimestamp = System.currentTimeMillis(); if (
	 * (nowTimestamp - startTimestamp) > limitTimeInterval) break; }
	 * 
	 * } catch (SMEException ex) { LOGGER.error("DEBUG: {}", ex.getMessage()); }
	 * catch (InterruptedException ie) {
	 * EgovBasicLogger.ignore("InterruptedException", ie); } finally {
	 * receiver.close(); } }
	 */
}
