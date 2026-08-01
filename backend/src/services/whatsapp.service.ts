export class WhatsAppService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v25.0";
    }

    async sendOtp(toPhoneNumber: string, otp: string): Promise<boolean> {
        const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
        const phoneNumberId =
            process.env.WHATSAPP_PHONE_NUMBER_ID || "1196590153537472";
        const templateName =
            process.env.WHATSAPP_TEMPLATE_NAME || "ncp_learning_protal_login";
        const templateLang =
            process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";

        if (!token) {
            console.error("[WhatsApp] Access token missing.");
            return false;
        }

        // Clean phone number
        let cleanPhone = toPhoneNumber.replace(/\D/g, "");
        if (cleanPhone.length === 10) {
            cleanPhone = `91${cleanPhone}`;
        }

        const url = `${this.apiUrl}/${phoneNumberId}/messages`;

        const payload = {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: templateLang,
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: otp,
                            },
                        ],
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: "0",
                        parameters: [
                            {
                                type: "text",
                                text: otp,
                            },
                        ],
                    },
                ],
            },
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("[WhatsApp] Meta Error:", data);
                return false;
            }

            return true;
        } catch (err) {
            console.error("[WhatsApp] Request Failed:", err);
            return false;
        }
    }
}

export const whatsAppService = new WhatsAppService();