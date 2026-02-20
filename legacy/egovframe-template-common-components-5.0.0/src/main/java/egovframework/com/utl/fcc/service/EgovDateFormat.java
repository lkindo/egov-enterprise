package egovframework.com.utl.fcc.service;

import java.text.DateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * ?좎쭨 諛??쒓컙?????蹂?섏쓣 ?섑뻾?섎뒗 ?대옒??
 *  2024.10.29	LeeBaekHaeng	以묐났 肄붾뱶 ?쒓굅 由ы뙥?좊쭅
 */
public class EgovDateFormat {

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨瑜?蹂?섑븳??
	 *
	 * @param date ?좎쭨
	 * @return ?좎쭨 臾몄옄??
	 */
	public static String formatDate(Date date) {
		return formatDate(DateFormat.DEFAULT, Locale.getDefault(), date);
	}

	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨瑜?蹂?섑븳??
	 *
	 * @param locale 濡쒖???
	 * @param date ?좎쭨
	 * @return ?좎쭨 臾몄옄??
	 */
	public static String formatDate(Locale locale, Date date) {
		return formatDate(DateFormat.DEFAULT, locale, date);
	}

	/**
	 * 二쇱뼱吏??ㅽ??쇱뿉 ?곕씪, 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨瑜?蹂?섑븳??
	 *
	 * @param style ?좎쭨 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param date ?좎쭨
	 * @return ?좎쭨 臾몄옄??
	 */
	public static String formatDate(int style, Date date) {
		return formatDate(style, Locale.getDefault(), date);
	}

	/**
	 * 二쇱뼱吏??ㅽ??쇱뿉 ?곕씪, Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨瑜?蹂?섑븳??
	 *
	 * @param style ?좎쭨 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param locale 濡쒖???
	 * @param date ?좎쭨
	 * @return ?좎쭨 臾몄옄??
	 */
	public static String formatDate(int style, Locale locale, Date date) {
		return DateFormat.getDateInstance(style, locale).format(date);
	}

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨 諛??쒓컙??蹂?섑븳??
	 *
	 * @param date ?좎쭨 諛??쒓컙
	 * @return ?좎쭨 諛??쒓컙 臾몄옄??
	 */
	public static String formatDateTime(Date date) {
		return formatDateTime(DateFormat.DEFAULT, DateFormat.DEFAULT, Locale.getDefault(), date);
	}

	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨 諛??쒓컙??蹂?섑븳??
	 *
	 * @param locale 濡쒖???
	 * @param date ?좎쭨 諛??쒓컙
	 * @return ?좎쭨 諛??쒓컙 臾몄옄??
	 */
	public static String formatDateTime(Locale locale, Date date) {
		return formatDateTime(DateFormat.DEFAULT, DateFormat.DEFAULT, locale, date);
	}

	/**
	 * 二쇱뼱吏??ㅽ??쇱뿉 ?곕씪, 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨 諛??쒓컙??蹂?섑븳??
	 *
	 * @param dateStyle ?좎쭨 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param timeStyle ?쒓컙 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param date ?좎쭨 諛??쒓컙
	 * @return ?좎쭨 諛??쒓컙 臾몄옄??
	 */
	public static String formatDateTime(int dateStyle, int timeStyle, Date date) {
		return formatDateTime(dateStyle, timeStyle, Locale.getDefault(), date);
	}

	/**
	 * 二쇱뼱吏??ㅽ??쇱뿉 ?곕씪, Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?좎쭨 諛??쒓컙??蹂?섑븳??
	 *
	 * @param dateStyle ?좎쭨 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param timeStyle ?쒓컙 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param locale 濡쒖???
	 * @param date ?좎쭨 諛??쒓컙
	 * @return ?좎쭨 諛??쒓컙 臾몄옄??
	 */
	public static String formatDateTime(int dateStyle, int timeStyle, Locale locale, Date date) {
		return DateFormat.getDateTimeInstance(dateStyle, timeStyle, locale).format(date);
	}

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쒓컙??蹂?섑븳??
	 *
	 * @param date ?쒓컙
	 * @return ?쒓컙 臾몄옄??
	 */
	public static String formatTime(Date date) {
		return formatTime(DateFormat.DEFAULT, Locale.getDefault(), date);
	}

	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쒓컙??蹂?섑븳??
	 *
	 * @param locale 濡쒖???
	 * @param date ?쒓컙
	 * @return ?쒓컙 臾몄옄??
	 */
	public static String formatTime(Locale locale, Date date) {
		return formatTime(DateFormat.DEFAULT, locale, date);
	}

	/**
	 * 二쇱뼱吏??ㅽ??쇱뿉 ?곕씪, 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쒓컙??蹂?섑븳??
	 *
	 * @param style ?쒓컙 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param date ?쒓컙
	 * @return ?쒓컙 臾몄옄??
	 */
	public static String formatTime(int style, Date date) {
		return formatTime(style, Locale.getDefault(), date);
	}

	/**
	 * 二쇱뼱吏??ㅽ??쇱뿉 ?곕씪, Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쒓컙??蹂?섑븳??
	 *
	 * @param style ?쒓컙 ?ㅽ???(?ъ슜 媛?ν븳 媛?: {@link DateFormat#FULL}, {@link DateFormat#LONG}, {@link DateFormat#MEDIUM}, {@link DateFormat#SHORT}, {@link DateFormat#DEFAULT})
	 * @param locale 濡쒖???
	 * @param date ?쒓컙
	 * @return ?쒓컙 臾몄옄??
	 */
	public static String formatTime(int style, Locale locale, Date date) {
		return DateFormat.getTimeInstance(style, locale).format(date);
	}

}