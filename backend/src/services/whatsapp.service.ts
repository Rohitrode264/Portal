export class WhatsAppService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    }

    async sendOtp(toPhoneNumber: string, otp: string): Promise<boolean> {
        const token = process.env.WHATSAPP_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const apiUrl = process.env.WHATSAPP_API_URL || this.apiUrl;
        const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
        const templateLang = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

        console.log(`[WhatsApp] Sending OTP ${otp} to ${toPhoneNumber}`);
        
        if (!token || !phoneNumberId) {
            console.warn('[WhatsApp] Credentials missing in .env. Simulating OTP send only.');
            return true;
        }

        try {
            const url = `${apiUrl}/${phoneNumberId}/messages`;
            const cleanPhone = toPhoneNumber.replace(/[^0-9]/g, '');
            
            // Format payload: use approved Meta Template if provided in .env, otherwise fallback to text
            const payload: any = templateName ? {
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: templateLang
                    },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                {
                                    type: 'text',
                                    text: otp
                                }
                            ]
                        },
                        {
                            type: 'button',
                            sub_type: 'url',
                            index: '0',
                            parameters: [
                                {
                                    type: 'text',
                                    text: otp
                                }
                            ]
                        }
                    ]
                }
            } : {
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'text',
                text: {
                    body: `Your Portal Login OTP is: ${otp}. It is valid for 5 minutes. Do not share this with anyone.`
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[WhatsApp] Failed to send OTP:', JSON.stringify(errorData, null, 2));
                
                // If button parameter failed (e.g. template has no button), retry with body only
                if (templateName && JSON.stringify(errorData).includes('parameter')) {
                    console.log('[WhatsApp] Retrying template with body parameter only...');
                    delete payload.template.components[1];
                    const retryRes = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    if (retryRes.ok) {
                        console.log('[WhatsApp] OTP sent successfully on retry.');
                        return true;
                    }
                }
                return false;
            }

            console.log('[WhatsApp] OTP sent successfully.');
            return true;
        } catch (error) {
            console.error('[WhatsApp] Error sending OTP:', error);
            return false;
        }
    }
}

export const whatsAppService = new WhatsAppService();
