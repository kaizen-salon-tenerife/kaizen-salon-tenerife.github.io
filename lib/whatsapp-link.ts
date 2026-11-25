/** Open WhatsApp without the wa.me redirect, which can replace emoji with U+FFFD. */
export function whatsappLink(phone:string,message:string) {
  return `https://api.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}
