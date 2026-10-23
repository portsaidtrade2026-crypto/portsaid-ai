// Floating WhatsApp button, shown on every page so a visitor can start a
// real chat with the business in one tap. WHATSAPP_NUMBER is the business's
// own WhatsApp number (Ahmed provided it directly) - wa.me needs digits only,
// no "+".
const WHATSAPP_NUMBER = "902128750605"

const WhatsAppButton = () => {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-5 right-5 z-[9999] flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-105 transition-transform"
    >
      <svg viewBox="0 0 32 32" width="30" height="30" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.004 2.667c-7.363 0-13.333 5.97-13.333 13.333 0 2.353.615 4.65 1.784 6.671L2.667 29.333l6.83-1.752a13.28 13.28 0 0 0 6.507 1.72h.006c7.362 0 13.333-5.97 13.333-13.333 0-3.56-1.387-6.907-3.906-9.427a13.246 13.246 0 0 0-9.433-3.874zm0 24.4h-.005a11.06 11.06 0 0 1-5.64-1.545l-.404-.24-4.053 1.04 1.082-3.951-.264-.406a11.05 11.05 0 0 1-1.696-5.925c0-6.113 4.975-11.088 11.086-11.088a11.02 11.02 0 0 1 7.842 3.25 11.02 11.02 0 0 1 3.245 7.843c0 6.113-4.976 11.088-11.093 11.088zm6.083-8.303c-.334-.167-1.973-.973-2.279-1.084-.306-.111-.529-.167-.751.167-.223.334-.863 1.084-1.058 1.307-.195.223-.39.25-.723.084-.334-.167-1.409-.52-2.684-1.656-.992-.885-1.662-1.978-1.857-2.312-.195-.334-.021-.514.146-.681.15-.15.334-.39.5-.585.167-.195.223-.334.334-.557.111-.223.056-.418-.028-.585-.084-.167-.751-1.81-1.029-2.479-.271-.652-.546-.564-.751-.574a14.4 14.4 0 0 0-.64-.012c-.223 0-.585.084-.891.418s-1.169 1.142-1.169 2.785 1.197 3.23 1.364 3.452c.167.223 2.355 3.595 5.705 5.042.797.344 1.42.55 1.905.704.8.254 1.529.218 2.104.132.642-.096 1.973-.807 2.251-1.586.278-.78.278-1.447.195-1.586-.084-.14-.306-.223-.64-.39z"/>
      </svg>
    </a>
  )
}

export default WhatsAppButton
