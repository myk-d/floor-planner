/**
 * Приватний застосунок на 2 людини. Додай сюди другий email
 * і синхронізуй той самий список у `firestore.rules` (функція `allowedEmails`).
 */
export const ALLOWED_EMAILS: readonly string[] = ['dzeban03@gmail.com', 'dzobaniryna@gmail.com'];

export const isAllowedEmail = (email: string | null | undefined): boolean =>
	!!email && ALLOWED_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
