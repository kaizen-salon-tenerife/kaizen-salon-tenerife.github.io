/** WhatsApp's link/app handoff can replace emoji with U+FFFD, even without wa.me.
 * Use readable text for links; the separate clipboard action keeps full Unicode.
 */
export function whatsappLink(phone:string,message:string) {
  const text=message.replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0E\uFE0F\u20E3]/gu,"").replace(/[ \t]{2,}/g," ").replace(/^[ \t]+|[ \t]+$/gm,"");
  return `https://api.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
}
